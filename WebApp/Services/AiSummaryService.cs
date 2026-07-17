using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public class AiSummaryService
{
    private readonly ApplicationDbContext _db;
    private readonly IHttpClientFactory _httpFactory;
    private readonly AiSummaryOptions _options;
    private readonly ILogger<AiSummaryService> _logger;

    private string? _cachedToken;
    private DateTimeOffset _tokenExpiresAt = DateTimeOffset.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    public AiSummaryService(
        ApplicationDbContext db,
        IHttpClientFactory httpFactory,
        IOptions<AiSummaryOptions> options,
        ILogger<AiSummaryService> logger)
    {
        _db = db;
        _httpFactory = httpFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AiSummary?> GetAsync(int surveyId, string summaryType)
    {
        return await _db.AiSummaries
            .FirstOrDefaultAsync(a => a.SurveyId == surveyId && a.SummaryType == summaryType);
    }

    public async Task<AiSummary?> GenerateOverallAsync(int surveyId, CancellationToken ct = default)
    {
        var survey = await _db.Surveys.FindAsync(surveyId);
        if (survey == null)
        {
            _logger.LogWarning("Survey {Id} not found", surveyId);
            return null;
        }

        var prompt = await BuildOverallPromptAsync(surveyId, ct);
        var content = await CallLlmAsync(prompt, ct);
        if (content == null) return null;

        return await UpsertAsync(surveyId, "overall", content, ct);
    }

    public async Task<AiSummary?> GenerateTargetAsync(int surveyId, int targetId, CancellationToken ct = default)
    {
        var survey = await _db.Surveys.FindAsync(surveyId);
        if (survey == null) return null;

        var target = await _db.Users.FindAsync(targetId);
        if (target == null) return null;

        var prompt = await BuildTargetPromptAsync(surveyId, targetId, target.Name, ct);
        var content = await CallLlmAsync(prompt, ct);
        if (content == null) return null;

        return await UpsertAsync(surveyId, $"target_{targetId}", content, ct);
    }

    public async Task DeleteAsync(int surveyId, string summaryType, CancellationToken ct = default)
    {
        var existing = await _db.AiSummaries
            .FirstOrDefaultAsync(a => a.SurveyId == surveyId && a.SummaryType == summaryType, ct);
        if (existing == null) return;

        _db.AiSummaries.Remove(existing);
        await _db.SaveChangesAsync(ct);
    }

    private async Task<AiSummary> UpsertAsync(int surveyId, string summaryType, string content, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var existing = await _db.AiSummaries
            .FirstOrDefaultAsync(a => a.SurveyId == surveyId && a.SummaryType == summaryType, ct);

        if (existing != null)
        {
            existing.Content = content;
            existing.UpdatedAt = now;
        }
        else
        {
            existing = new AiSummary
            {
                SurveyId = surveyId,
                SummaryType = summaryType,
                Content = content,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.AiSummaries.Add(existing);
        }

        await _db.SaveChangesAsync(ct);
        return existing;
    }

    private async Task<string?> CallLlmAsync(string prompt, CancellationToken ct)
    {
        if (!_options.Enabled)
        {
            _logger.LogDebug("AI Summary is disabled");
            return null;
        }

        if (string.IsNullOrWhiteSpace(_options.ChatBaseUrl))
        {
            _logger.LogWarning("AI Summary ChatBaseUrl is not configured");
            return null;
        }

        try
        {
            var authHeader = await ResolveAuthAsync(ct);
            if (authHeader == null && _options.AuthType != "none")
            {
                _logger.LogWarning("Failed to resolve auth for AI provider");
                return null;
            }

            var client = _httpFactory.CreateClient("Ai");
            var url = $"{_options.ChatBaseUrl.TrimEnd('/')}{_options.ChatEndpoint}";

            var body = new
            {
                model = _options.Model,
                messages = new[]
                {
                    new { role = "system", content = "Ты — опытный HR-аналитик. Анализируешь результаты 360° опросов. Отвечай на русском языке, структурированно, по существу. Используй markdown для форматирования." },
                    new { role = "user", content = prompt }
                },
                temperature = 0.3,
                max_tokens = 2000,
            };

            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(body)
            };

            if (authHeader != null)
                request.Headers.Authorization = authHeader;

            _logger.LogInformation("Calling AI provider: {Url}", url);
            var response = await client.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("AI provider returned {Status}: {Error}", response.StatusCode, error);
                return null;
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
            var text = json.GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return text?.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call AI provider");
            return null;
        }
    }

    private async Task<System.Net.Http.Headers.AuthenticationHeaderValue?> ResolveAuthAsync(CancellationToken ct)
    {
        return _options.AuthType.ToLowerInvariant() switch
        {
            "none" => null,
            "bearer" => new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.ApiKey),
            "basic" => new System.Net.Http.Headers.AuthenticationHeaderValue("Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes(_options.ApiKey))),
            "oauth" => await GetOAuthTokenAsync(ct),
            _ => throw new InvalidOperationException($"Unknown AuthType: {_options.AuthType}")
        };
    }

    private async Task<System.Net.Http.Headers.AuthenticationHeaderValue?> GetOAuthTokenAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId) || string.IsNullOrWhiteSpace(_options.ClientSecret))
        {
            _logger.LogWarning("OAuth is configured but ClientId/ClientSecret are missing");
            return null;
        }

        if (_cachedToken != null && DateTimeOffset.UtcNow < _tokenExpiresAt)
            return new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedToken);

        await _tokenLock.WaitAsync(ct);
        try
        {
            if (_cachedToken != null && DateTimeOffset.UtcNow < _tokenExpiresAt)
                return new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedToken);

            var client = _httpFactory.CreateClient("Ai");
            var url = $"{_options.OAuthBaseUrl.TrimEnd('/')}/api/v2/oauth";

            var credentials = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}"));

            _logger.LogInformation("Requesting OAuth token from {Url}", url);

            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("scope", _options.Scope)
                })
            };
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
            request.Headers.Add("RqUID", Guid.NewGuid().ToString());

            var response = await client.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OAuth failed: {Status}: {Body}", response.StatusCode, body);
                return null;
            }

            var json = JsonSerializer.Deserialize<JsonElement>(body);
            var accessToken = json.GetProperty("access_token").GetString();

            if (json.TryGetProperty("expires_in", out var expiresInProp))
            {
                _tokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(expiresInProp.GetInt32() - 60);
            }
            else if (json.TryGetProperty("expires_at", out var expiresAtProp))
            {
                var expiresAtMs = expiresAtProp.GetInt64();
                _tokenExpiresAt = DateTimeOffset.FromUnixTimeMilliseconds(expiresAtMs).AddSeconds(-60);
            }
            else
            {
                _tokenExpiresAt = DateTimeOffset.UtcNow.AddMinutes(29);
            }

            _cachedToken = accessToken;
            _logger.LogInformation("OAuth token obtained, expires at {ExpiresAt}", _tokenExpiresAt);
            return new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OAuth request failed");
            return null;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private async Task<string> BuildOverallPromptAsync(int surveyId, CancellationToken ct)
    {
        var questions = await _db.Questions
            .Where(q => q.SurveyId == surveyId)
            .OrderBy(q => q.Order)
            .ToListAsync(ct);

        var answers = await _db.Answers
            .Where(a => questions.Select(q => q.Id).Contains(a.QuestionId))
            .ToListAsync(ct);

        var users = await _db.Users
            .Where(u => answers.Select(a => a.UserId).Concat(answers.Select(a => a.TargetId)).Distinct().Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        var sb = new StringBuilder();
        sb.AppendLine("Проанализируй результаты 360° опроса и дай общее саммари.");
        sb.AppendLine();
        sb.AppendLine("=== Вопросы и ответы ===");
        sb.AppendLine();

        foreach (var q in questions)
        {
            sb.AppendLine($"Вопрос: {q.Text} (тип: {q.Type})");

            var qAnswers = answers.Where(a => a.QuestionId == q.Id).ToList();
            foreach (var a in qAnswers)
            {
                var reviewer = users.TryGetValue(a.UserId, out var ru) ? ru.Name : $"Рецензент #{a.UserId}";
                var target = users.TryGetValue(a.TargetId, out var tu) ? tu.Name : $"Объект #{a.TargetId}";
                var formatted = SurveyAnswerFormatter.FormatPlain(q, a.Text);
                sb.AppendLine($"  [{reviewer} → {target}]: {formatted}");
            }
            sb.AppendLine();
        }

        sb.AppendLine("=== Конец данных ===");
        sb.AppendLine();
        sb.AppendLine("Дай краткое саммари на русском языке:");
        sb.AppendLine("1. Общая оценка уровня команды");
        sb.AppendLine("2. Сильные стороны (что хорошо)");
        sb.AppendLine("3. Зоны роста (что нужно развивать)");
        sb.AppendLine("4. Конкретные рекомендации");

        return sb.ToString();
    }

    private async Task<string> BuildTargetPromptAsync(int surveyId, int targetId, string targetName, CancellationToken ct)
    {
        var questions = await _db.Questions
            .Where(q => q.SurveyId == surveyId)
            .OrderBy(q => q.Order)
            .ToListAsync(ct);

        var answers = await _db.Answers
            .Where(a => a.TargetId == targetId && questions.Select(q => q.Id).Contains(a.QuestionId))
            .ToListAsync(ct);

        var reviewerIds = answers.Select(a => a.UserId).Distinct().ToList();
        var reviewers = await _db.Users
            .Where(u => reviewerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        var sb = new StringBuilder();
        sb.AppendLine($"Проанализируй результаты 360° опроса для: {targetName}");
        sb.AppendLine();
        sb.AppendLine("=== Ответы рецензентов ===");
        sb.AppendLine();

        foreach (var q in questions)
        {
            sb.AppendLine($"Вопрос: {q.Text} (тип: {q.Type})");

            var qAnswers = answers.Where(a => a.QuestionId == q.Id).ToList();
            foreach (var a in qAnswers)
            {
                var reviewer = reviewers.TryGetValue(a.UserId, out var ru) ? ru.Name : $"Рецензент #{a.UserId}";
                var formatted = SurveyAnswerFormatter.FormatPlain(q, a.Text);
                sb.AppendLine($"  [{reviewer}]: {formatted}");
            }
            sb.AppendLine();
        }

        sb.AppendLine("=== Конец данных ===");
        sb.AppendLine();
        sb.AppendLine($"Дай краткое саммари по оценке {targetName} на русском языке:");
        sb.AppendLine("1. Общая оценка");
        sb.AppendLine("2. Сильные стороны");
        sb.AppendLine("3. Зоны роста");
        sb.AppendLine("4. Рекомендации по развитию");

        return sb.ToString();
    }
}
