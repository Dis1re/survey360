using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public record RespondentLinkDto(int ReviewerId, string ReviewerName, string ReviewerEmail, string Token);

public record InviteInfoDto(int SurveyId, int ReviewerId);

public class SurveyRespondentLinkService(ApplicationDbContext context)
{
    public async Task SyncRespondentLinksAsync(int surveyId, CancellationToken ct)
    {
        var assignedReviewerIds = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.SurveyId == surveyId && a.IsAssigned)
            .Select(a => a.ReviewerId)
            .Distinct()
            .ToListAsync(ct);

        var assignedSet = assignedReviewerIds.ToHashSet();

        await context.SurveyParticipants
            .Where(p => p.SurveyId == surveyId && p.IsRespondent && !p.IsTarget && !assignedSet.Contains(p.UserId))
            .ExecuteDeleteAsync(ct);

        await context.SurveyParticipants
            .Where(p => p.SurveyId == surveyId && p.IsRespondent && p.IsTarget && !assignedSet.Contains(p.UserId))
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.IsRespondent, false)
                .SetProperty(p => p.Token, (string?)null)
                .SetProperty(p => p.CreatedAt, default(DateTime)),
                ct);

        if (assignedReviewerIds.Count == 0)
            return;

        var existingTokenUserIds = await context.SurveyParticipants
            .AsNoTracking()
            .Where(p => p.SurveyId == surveyId && p.IsRespondent && p.Token != null)
            .Select(p => p.UserId)
            .ToHashSetAsync(ct);

        var missing = assignedReviewerIds.Where(id => !existingTokenUserIds.Contains(id)).ToList();
        if (missing.Count == 0)
            return;

        foreach (var reviewerId in missing)
        {
            var participant = await context.SurveyParticipants
                .FirstOrDefaultAsync(p => p.SurveyId == surveyId && p.UserId == reviewerId, ct);

            if (participant is null)
            {
                participant = new SurveyParticipant
                {
                    SurveyId = surveyId,
                    UserId = reviewerId,
                    IsRespondent = true,
                    Token = Guid.NewGuid().ToString("N"),
                    CreatedAt = DateTime.UtcNow,
                };
                await context.SurveyParticipants.AddAsync(participant, ct);
            }
            else
            {
                participant.IsRespondent = true;
                if (participant.Token is null)
                {
                    participant.Token = Guid.NewGuid().ToString("N");
                    participant.CreatedAt = DateTime.UtcNow;
                }
            }
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task<List<RespondentLinkDto>> GetLinksAsync(int surveyId, CancellationToken ct)
    {
        var rows = await context.SurveyParticipants
            .AsNoTracking()
            .Where(p => p.SurveyId == surveyId && p.IsRespondent && p.Token != null)
            .Join(
                context.Users.AsNoTracking(),
                p => p.UserId,
                u => u.Id,
                (p, u) => new { p.Token, u.Id, u.Name, u.Email })
            .ToListAsync(ct);

        return rows
            .OrderBy(x => x.Name)
            .Select(x => new RespondentLinkDto(x.Id, x.Name, x.Email, x.Token!))
            .ToList();
    }

    public async Task<InviteInfoDto?> ResolveTokenAsync(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        var participant = await context.SurveyParticipants
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Token == token, ct);

        if (participant is null)
            return null;

        if (!await context.Surveys.AnyAsync(s => s.Id == participant.SurveyId, ct))
            return null;

        if (!await context.Users.AnyAsync(u => u.Id == participant.UserId, ct))
            return null;

        if (!participant.IsRespondent)
            return null;

        var hasAssignment = await context.SurveyAssignments
            .AsNoTracking()
            .AnyAsync(
                a => a.SurveyId == participant.SurveyId && a.ReviewerId == participant.UserId && a.IsAssigned,
                ct);

        if (!hasAssignment)
            return null;

        return new InviteInfoDto(participant.SurveyId, participant.UserId);
    }

    public async Task DeleteLinkAsync(int surveyId, int reviewerId, CancellationToken ct)
    {
        await context.SurveyParticipants
            .Where(p => p.SurveyId == surveyId && p.UserId == reviewerId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Token, (string?)null)
                .SetProperty(p => p.CreatedAt, default(DateTime)),
                ct);
    }
}
