using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public record RespondentLinkDto(int ReviewerId, string ReviewerName, string ReviewerEmail, string Token);

public record InviteInfoDto(int SurveyId, int ReviewerId);

public class SurveyRespondentLinkService(ApplicationDbContext context)
{
    private async Task<HashSet<int>> GetAssignedReviewerIdsAsync(int surveyId, CancellationToken ct)
    {
        var ids = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.SurveyId == surveyId && a.IsAssigned)
            .Select(a => a.ReviewerId)
            .Distinct()
            .ToListAsync(ct);

        return ids.ToHashSet();
    }

    public async Task SyncRespondentLinksAsync(int surveyId, CancellationToken ct)
    {
        var assignedReviewerIds = await GetAssignedReviewerIdsAsync(surveyId, ct);

        await context.SurveyRespondentLinks
            .Where(l => l.SurveyId == surveyId && !assignedReviewerIds.Contains(l.ReviewerId))
            .ExecuteDeleteAsync(ct);

        if (assignedReviewerIds.Count == 0)
            return;

        var existingIds = await context.SurveyRespondentLinks
            .AsNoTracking()
            .Where(l => l.SurveyId == surveyId)
            .Select(l => l.ReviewerId)
            .ToHashSetAsync(ct);

        var missing = assignedReviewerIds.Where(id => !existingIds.Contains(id)).ToList();
        if (missing.Count == 0)
            return;

        foreach (var reviewerId in missing)
        {
            await context.SurveyRespondentLinks.AddAsync(new SurveyRespondentLink
            {
                SurveyId = surveyId,
                ReviewerId = reviewerId,
                Token = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.UtcNow,
            }, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task<List<RespondentLinkDto>> GetLinksAsync(int surveyId, CancellationToken ct)
    {
        await SyncRespondentLinksAsync(surveyId, ct);

        var assignedReviewerIds = await GetAssignedReviewerIdsAsync(surveyId, ct);
        if (assignedReviewerIds.Count == 0)
            return [];

        return await context.SurveyRespondentLinks
            .AsNoTracking()
            .Where(l => l.SurveyId == surveyId && assignedReviewerIds.Contains(l.ReviewerId))
            .Join(
                context.Users.AsNoTracking(),
                l => l.ReviewerId,
                u => u.Id,
                (l, u) => new { u.Id, u.Name, u.Email, l.Token })
            .OrderBy(x => x.Name)
            .Select(x => new RespondentLinkDto(x.Id, x.Name, x.Email, x.Token))
            .ToListAsync(ct);
    }

    public async Task<InviteInfoDto?> ResolveTokenAsync(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        var link = await context.SurveyRespondentLinks
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Token == token, ct);

        if (link is null)
            return null;

        if (!await context.Surveys.AnyAsync(s => s.Id == link.SurveyId, ct))
            return null;

        if (!await context.Users.AnyAsync(u => u.Id == link.ReviewerId, ct))
            return null;

        var isRespondent = await context.SurveyParticipants
            .AsNoTracking()
            .AnyAsync(p => p.SurveyId == link.SurveyId && p.UserId == link.ReviewerId && p.IsRespondent, ct);

        if (!isRespondent)
            return null;

        var hasAssignment = await context.SurveyAssignments
            .AsNoTracking()
            .AnyAsync(
                a => a.SurveyId == link.SurveyId && a.ReviewerId == link.ReviewerId && a.IsAssigned,
                ct);

        if (!hasAssignment)
            return null;

        return new InviteInfoDto(link.SurveyId, link.ReviewerId);
    }

    public async Task DeleteLinkAsync(int surveyId, int reviewerId, CancellationToken ct)
    {
        await context.SurveyRespondentLinks
            .Where(l => l.SurveyId == surveyId && l.ReviewerId == reviewerId)
            .ExecuteDeleteAsync(ct);
    }
}
