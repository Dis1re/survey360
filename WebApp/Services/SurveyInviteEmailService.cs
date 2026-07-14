using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public record SendInviteItemResult(int ReviewerId, string ReviewerEmail, string Status, string? Error);

public record SendInvitesResult(int Sent, int Skipped, int Failed, List<SendInviteItemResult> Items);

public class SurveyInviteEmailService(
    ApplicationDbContext context,
    SurveyRespondentLinkService linkService,
    EmailService emailService,
    IOptions<EmailSettings> options,
    ILogger<SurveyInviteEmailService> logger)
{
    private readonly EmailSettings _settings = options.Value;

    public async Task<SendInvitesResult> SendInvitesAsync(
        int surveyId,
        int? reviewerId,
        CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == surveyId, ct)
            ?? throw new InvalidOperationException("Опрос не найден");

        if (!string.Equals(survey.Status, "Активен", StringComparison.Ordinal))
            throw new InvalidOperationException("Рассылка доступна только для активного опроса");

        var links = await linkService.GetLinksAsync(surveyId, ct);
        if (reviewerId is int onlyId)
            links = links.Where(l => l.ReviewerId == onlyId).ToList();

        var targetsByReviewer = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.SurveyId == surveyId && a.IsAssigned)
            .Join(
                context.Users.AsNoTracking(),
                a => a.TargetId,
                u => u.Id,
                (a, u) => new { a.ReviewerId, TargetName = u.Name })
            .GroupBy(x => x.ReviewerId)
            .ToDictionaryAsync(
                g => g.Key,
                g => g.Select(x => x.TargetName).OrderBy(n => n).ToList(),
                ct);

        var baseUrl = _settings.PublicBaseUrl.TrimEnd('/');
        var items = new List<SendInviteItemResult>();
        var sent = 0;
        var skipped = 0;
        var failed = 0;
        var delayMs = Math.Max(0, _settings.DelayBetweenEmailsMs);
        var isFirstSend = true;

        foreach (var link in links)
        {
            if (string.IsNullOrWhiteSpace(link.ReviewerEmail))
            {
                skipped++;
                items.Add(new SendInviteItemResult(link.ReviewerId, "", "skipped", "Нет email"));
                continue;
            }

            if (!isFirstSend && delayMs > 0)
                await Task.Delay(delayMs, ct);
            isFirstSend = false;

            var targets = targetsByReviewer.GetValueOrDefault(link.ReviewerId) ?? [];
            var inviteUrl = $"{baseUrl}/survey/invite/{link.Token}";
            var subject = $"Приглашение к опросу: {survey.Name}";
            var body = BuildBody(link.ReviewerName, survey, targets, inviteUrl);

            try
            {
                await emailService.SendAsync(link.ReviewerEmail, link.ReviewerName, subject, body, ct);
                sent++;
                items.Add(new SendInviteItemResult(link.ReviewerId, link.ReviewerEmail, "sent", null));
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex, "Failed to send invite to {Email}", link.ReviewerEmail);
                items.Add(new SendInviteItemResult(
                    link.ReviewerId,
                    link.ReviewerEmail,
                    "failed",
                    FlattenException(ex)));
            }
        }

        return new SendInvitesResult(sent, skipped, failed, items);
    }

    private static string FlattenException(Exception ex)
    {
        var parts = new List<string>();
        for (var e = ex; e != null; e = e.InnerException)
        {
            if (!string.IsNullOrWhiteSpace(e.Message) && (parts.Count == 0 || parts[^1] != e.Message))
                parts.Add(e.Message);
        }
        return string.Join(" → ", parts);
    }

    private static string BuildBody(
        string reviewerName,
        Survey survey,
        List<string> targetNames,
        string inviteUrl)
    {
        var greeting = string.IsNullOrWhiteSpace(reviewerName)
            ? "Здравствуйте!"
            : $"Здравствуйте, {reviewerName}!";

        var about = targetNames.Count switch
        {
            0 => "О ком опрос: объекты оценки не назначены.",
            1 => $"О ком опрос: {targetNames[0]}.",
            _ => $"О ком опрос: {string.Join(", ", targetNames)}.",
        };

        var descriptionBlock = string.IsNullOrWhiteSpace(survey.Description)
            ? ""
            : $"\n\nОписание опроса:\n{survey.Description.Trim()}";

        return
            $"{greeting}\n\n" +
            $"Вас приглашают пройти опрос «{survey.Name}».\n\n" +
            $"{about}{descriptionBlock}\n\n" +
            "Перейдите по персональной ссылке:\n" +
            $"{inviteUrl}\n";
    }
}
