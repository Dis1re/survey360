using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WebApp.Data;

namespace WebApp.Services;

public record OutgoingEmail(string ToEmail, string ToName, string Subject, string TextBody);

public class EmailService(
    HttpClient httpClient,
    IOptions<EmailSettings> options,
    ILogger<EmailService> logger)
{
    private readonly EmailSettings _settings = options.Value;

    public async Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string textBody,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiToken) || _settings.SandboxId <= 0)
            throw new InvalidOperationException(
                "Email не настроен для HTTPS API: укажите Email:ApiToken и Email:SandboxId " +
                "(Mailtrap → Settings → API Tokens и ID sandbox из URL).");

        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _settings.ApiToken);

        var url = $"https://sandbox.api.mailtrap.io/api/send/{_settings.SandboxId}";
        var payload = new
        {
            from = new { email = _settings.From, name = _settings.FromName },
            to = new[]
            {
                new
                {
                    email = toEmail,
                    name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName,
                },
            },
            subject,
            text = textBody,
        };

        const int maxAttempts = 4;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            ct.ThrowIfCancellationRequested();

            using var response = await httpClient.PostAsJsonAsync(url, payload, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("Email sent via Mailtrap API to {Email}: {Subject}", toEmail, subject);
                return;
            }

            var isRateLimited = response.StatusCode == HttpStatusCode.TooManyRequests;
            if (isRateLimited && attempt < maxAttempts)
            {
                var delayMs = Math.Max(_settings.DelayBetweenEmailsMs, 1000) * attempt;
                logger.LogWarning(
                    "Mailtrap rate limit for {Email}, retry {Attempt}/{Max} in {Delay}ms",
                    toEmail,
                    attempt,
                    maxAttempts,
                    delayMs);
                await Task.Delay(delayMs, ct);
                continue;
            }

            logger.LogError(
                "Mailtrap API error {Status} for {Email}: {Body}",
                (int)response.StatusCode,
                toEmail,
                body);
            throw new InvalidOperationException(FormatApiError(response.StatusCode, body));
        }
    }

    private static string FormatApiError(HttpStatusCode status, string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("errors", out var errors) &&
                errors.ValueKind == JsonValueKind.Array)
            {
                var parts = new StringBuilder();
                foreach (var err in errors.EnumerateArray())
                {
                    if (parts.Length > 0) parts.Append("; ");
                    parts.Append(err.ValueKind == JsonValueKind.String ? err.GetString() : err.ToString());
                }
                if (parts.Length > 0)
                    return $"Mailtrap API [{(int)status}]: {parts}";
            }
        }
        catch
        {
            // ignore parse errors
        }

        return string.IsNullOrWhiteSpace(body)
            ? $"Mailtrap API error [{(int)status}]"
            : $"Mailtrap API [{(int)status}]: {body}";
    }
}
