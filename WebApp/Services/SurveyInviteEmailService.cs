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
            var subject = InviteEmailTemplates.BuildSubject(survey);
            var textBody = InviteEmailTemplates.BuildTextBody(link.ReviewerName, survey, targets, inviteUrl);
            var htmlBody = InviteEmailTemplates.BuildHtmlBody(link.ReviewerName, survey, targets, inviteUrl, baseUrl);

            try
            {
                await emailService.SendAsync(link.ReviewerEmail, link.ReviewerName, subject, textBody, htmlBody, ct);
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
}
