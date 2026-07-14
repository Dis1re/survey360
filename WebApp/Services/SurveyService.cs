using Microsoft.EntityFrameworkCore;
using WebApp.Areas.Api;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public class SurveyService(
    ApplicationDbContext context,
    SurveyRespondentLinkService linkService,
    SurveyInviteEmailService inviteEmailService,
    SurveyDocxReportService reportService,
    SurveyCsvReportService csvReportService)
{
    public static bool IsSurveyDraft(string status)
    {
        var normalized = status.Trim().ToLowerInvariant();
        return normalized.Contains("черновик") || normalized == "draft";
    }

    public static bool IsSurveyActive(string status)
    {
        var normalized = status.Trim();
        return normalized.Contains("актив", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("active", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<Survey?> GetSurveyAsync(int id, CancellationToken ct) =>
        await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task<Survey?> GetSurveyForEditAsync(int id, CancellationToken ct) =>
        await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task<int> CreateSurveyAsync(int? createdByUserId, CancellationToken ct)
    {
        var survey = new Survey
        {
            Name = "Новый опрос",
            Description = "",
            Status = "Черновик",
            CreatedAt = DateTime.UtcNow,
            StartedAt = default,
            ClosedAt = default,
            CreatedByUserId = createdByUserId,
        };
        await context.Surveys.AddAsync(survey, ct);
        await context.SaveChangesAsync(ct);
        return survey.Id;
    }

    public async Task<List<SurveyListItemDto>> ListSurveysAsync(int userId, CancellationToken ct)
    {
        var surveys = await context.Surveys.AsNoTracking().ToListAsync(ct);

        var myAssignments = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.ReviewerId == userId && a.IsAssigned)
            .Select(a => new { a.SurveyId, a.IsCompleted })
            .ToListAsync(ct);

        var statsBySurvey = myAssignments
            .GroupBy(a => a.SurveyId)
            .ToDictionary(
                g => g.Key,
                g => (Assigned: g.Count(), Completed: g.Count(a => a.IsCompleted)));

        var respondentSurveyIdSet = statsBySurvey.Keys.ToHashSet();

        return surveys
            .Where(s =>
                s.CreatedByUserId == userId ||
                (!IsSurveyDraft(s.Status) && respondentSurveyIdSet.Contains(s.Id)))
            .OrderByDescending(s => s.CreatedAt)
            .Select(s =>
            {
                statsBySurvey.TryGetValue(s.Id, out var stats);
                int? assigned = stats.Assigned > 0 ? stats.Assigned : null;
                int? completed = stats.Assigned > 0 ? stats.Completed : null;
                return new SurveyListItemDto(
                    s.Id, s.Name, s.Description, s.Status,
                    s.CreatedAt, s.StartedAt, s.ClosedAt,
                    s.CreatedByUserId, assigned, completed);
            })
            .ToList();
    }

    public async Task<SurveyDetailsDto?> GetSurveyDetailsAsync(int id, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null) return null;

        var questions = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == id)
            .OrderBy(q => q.Order).ThenBy(q => q.Id)
            .ToListAsync(ct);

        var questionIds = questions.Select(q => q.Id).ToList();
        var answers = questionIds.Count == 0
            ? []
            : await context.Answers
                .AsNoTracking()
                .Where(a => questionIds.Contains(a.QuestionId))
                .ToListAsync(ct);

        var assignments = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.SurveyId == id)
            .ToListAsync(ct);

        return new SurveyDetailsDto(survey, questions, answers, assignments);
    }

    public async Task<Survey?> UpdateSurveyAsync(int id, UpdateSurveyRequest request, CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null) return null;

        if (IsSurveyActive(request.Status))
        {
            var hasQuestions = await context.Questions.AnyAsync(q => q.SurveyId == id, ct);
            var hasAssignments = await context.SurveyAssignments
                .AnyAsync(a => a.SurveyId == id && a.IsAssigned, ct);

            if (!hasQuestions || !hasAssignments)
                return null;
        }

        survey.Name = request.Name;
        survey.Description = request.Description;
        survey.Status = request.Status;
        survey.StartedAt = IsSurveyActive(request.Status) ? DateTime.UtcNow : request.StartedAt ?? default;
        survey.ClosedAt = request.ClosedAt ?? default;

        if (IsSurveyActive(request.Status))
            await linkService.SyncRespondentLinksAsync(id, ct);

        await context.SaveChangesAsync(ct);
        return survey;
    }

    public async Task<bool> DeleteSurveyAsync(int id, CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null) return false;

        if (IsSurveyActive(survey.Status))
            return false;

        context.Surveys.Remove(survey);
        await context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<SurveyMatrixDto?> GetMatrixAsync(int id, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null) return null;

        var participants = await context.Set<SurveyParticipant>()
            .AsNoTracking()
            .Where(p => p.SurveyId == id)
            .ToListAsync(ct);

        var targetIds = participants.Where(p => p.IsTarget).Select(p => p.UserId).ToHashSet();
        var respondentIds = participants.Where(p => p.IsRespondent).Select(p => p.UserId).ToHashSet();
        var userIds = targetIds.Union(respondentIds).ToList();

        var users = userIds.Count == 0
            ? []
            : await context.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .OrderBy(u => u.Name)
                .ToListAsync(ct);

        var assignments = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.SurveyId == id)
            .ToListAsync(ct);

        return new SurveyMatrixDto(
            users.Where(u => targetIds.Contains(u.Id)).ToList(),
            users.Where(u => respondentIds.Contains(u.Id)).ToList(),
            assignments);
    }

    public async Task<bool> AddParticipantAsync(int surveyId, int userId, string role, CancellationToken ct)
    {
        var participant = await context.Set<SurveyParticipant>()
            .FirstOrDefaultAsync(p => p.SurveyId == surveyId && p.UserId == userId, ct);

        if (participant is null)
        {
            participant = new SurveyParticipant { SurveyId = surveyId, UserId = userId };
            await context.Set<SurveyParticipant>().AddAsync(participant, ct);
        }

        if (role == "target")
            participant.IsTarget = true;
        else
            participant.IsRespondent = true;

        await context.SaveChangesAsync(ct);
        return true;
    }

    public async Task RemoveParticipantAsync(int surveyId, int userId, string role, CancellationToken ct)
    {
        var participant = await context.Set<SurveyParticipant>()
            .FirstOrDefaultAsync(p => p.SurveyId == surveyId && p.UserId == userId, ct);

        if (participant is null) return;

        if (role == "target")
            participant.IsTarget = false;
        else
        {
            participant.IsRespondent = false;
            await linkService.DeleteLinkAsync(surveyId, userId, ct);
        }

        if (!participant.IsTarget && !participant.IsRespondent)
        {
            await context.Set<SurveyParticipant>()
                .Where(p => p.Id == participant.Id)
                .ExecuteDeleteAsync(ct);
        }
        else
        {
            await context.SaveChangesAsync(ct);
        }

        await context.SurveyAssignments
            .Where(a => a.SurveyId == surveyId &&
                ((role == "target" && a.TargetId == userId) ||
                 (role == "respondent" && a.ReviewerId == userId)))
            .ExecuteDeleteAsync(ct);
    }

    public async Task SaveAssignmentsAsync(int surveyId, List<AssignmentEntry> entries, CancellationToken ct)
    {
        var participants = await context.Set<SurveyParticipant>()
            .AsNoTracking()
            .Where(p => p.SurveyId == surveyId)
            .ToListAsync(ct);

        var targetIds = participants.Where(p => p.IsTarget).Select(p => p.UserId).ToHashSet();
        var respondentIds = participants.Where(p => p.IsRespondent).Select(p => p.UserId).ToHashSet();

        await context.SurveyAssignments
            .Where(a => a.SurveyId == surveyId)
            .ExecuteDeleteAsync(ct);

        var seen = new HashSet<(int ReviewerId, int TargetId)>();
        foreach (var entry in entries.Where(e => e.IsAssigned))
        {
            if (!respondentIds.Contains(entry.ReviewerId) || !targetIds.Contains(entry.TargetId))
                continue;

            var key = (entry.ReviewerId, entry.TargetId);
            if (!seen.Add(key))
                continue;

            await context.SurveyAssignments.AddAsync(new SurveyAssignment
            {
                SurveyId = surveyId,
                ReviewerId = entry.ReviewerId,
                TargetId = entry.TargetId,
                IsAssigned = true,
                IsCompleted = false,
            }, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task ReorderQuestionsAsync(int surveyId, List<int> orderedIds, CancellationToken ct)
    {
        var ids = orderedIds.Distinct().ToList();
        if (ids.Count == 0) return;

        var questions = await context.Questions
            .Where(q => q.SurveyId == surveyId)
            .ToListAsync(ct);

        var byId = questions.ToDictionary(q => q.Id);
        var order = 0;
        foreach (var questionId in ids)
        {
            if (byId.TryGetValue(questionId, out var question))
                question.Order = order++;
        }

        foreach (var question in questions)
        {
            if (!ids.Contains(question.Id))
                question.Order = order++;
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteAllQuestionsAsync(int surveyId, CancellationToken ct)
    {
        var questionIds = await context.Questions
            .Where(q => q.SurveyId == surveyId)
            .Select(q => q.Id)
            .ToListAsync(ct);

        if (questionIds.Count > 0)
        {
            await context.Answers
                .Where(a => questionIds.Contains(a.QuestionId))
                .ExecuteDeleteAsync(ct);

            await context.Questions
                .Where(q => q.SurveyId == surveyId)
                .ExecuteDeleteAsync(ct);
        }
    }

    public async Task<int?> CompleteAssignmentAsync(
        int surveyId, int reviewerId, int targetId, int? currentUserId, bool isAdmin, CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == surveyId, ct);
        if (survey is null) return null;

        var assignment = await context.SurveyAssignments
            .FirstOrDefaultAsync(
                a => a.SurveyId == surveyId && a.ReviewerId == reviewerId && a.TargetId == targetId,
                ct);

        if (assignment is null || !assignment.IsAssigned)
            return -1;

        var requiredQuestions = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == surveyId && q.IsRequired)
            .ToListAsync(ct);

        if (requiredQuestions.Count > 0)
        {
            var requiredIds = requiredQuestions.Select(q => q.Id).ToHashSet();
            var answeredRequiredIds = await context.Answers
                .AsNoTracking()
                .Where(a => a.UserId == reviewerId
                            && a.TargetId == targetId
                            && requiredIds.Contains(a.QuestionId)
                            && a.Text != null && a.Text.Trim() != "")
                .Select(a => a.QuestionId)
                .ToListAsync(ct);

            var missing = requiredQuestions
                .Where(q => !answeredRequiredIds.Contains(q.Id))
                .Select(q => new { q.Id, q.Text })
                .ToList();

            if (missing.Count > 0)
                return -2;
        }

        assignment.IsCompleted = true;
        await context.SaveChangesAsync(ct);

        var allAssignedCompleted = await context.SurveyAssignments
            .Where(a => a.SurveyId == surveyId && a.IsAssigned)
            .AllAsync(a => a.IsCompleted, ct);

        if (allAssignedCompleted)
        {
            survey.Status = "Завершен";
            survey.ClosedAt = DateTime.UtcNow;
            await context.SaveChangesAsync(ct);
        }

        return survey.Id;
    }

    public async Task<List<ResponseItemDto>> GetResponsesAsync(
        int surveyId, int reviewerId, int targetId, CancellationToken ct)
    {
        return await context.Answers
            .AsNoTracking()
            .Where(a => a.UserId == reviewerId && a.TargetId == targetId)
            .Join(
                context.Questions.AsNoTracking(),
                a => a.QuestionId,
                q => q.Id,
                (a, q) => new { q, a })
            .Where(x => x.q.SurveyId == surveyId)
            .OrderBy(x => x.q.Order)
            .ThenBy(x => x.q.Text)
            .Select(x => new ResponseItemDto(x.q.Text, x.a.Text))
            .ToListAsync(ct);
    }

    public async Task<int?> SaveAsTemplateAsync(int surveyId, string name, string description, CancellationToken ct)
    {
        var questions = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == surveyId)
            .OrderBy(q => q.Id)
            .ToListAsync(ct);

        if (questions.Count == 0)
            return null;

        var template = new SurveyTemplate
        {
            Name = name,
            Description = description,
            CreatedAt = DateTime.UtcNow,
        };
        await context.SurveyTemplates.AddAsync(template, ct);
        await context.SaveChangesAsync(ct);

        foreach (var q in questions)
        {
            context.QuestionTemplates.Add(new QuestionTemplate
            {
                SurveyTemplateId = template.Id,
                Text = q.Text,
                Type = q.Type,
                IsRequired = q.IsRequired,
                Props = q.Props,
            });
        }
        await context.SaveChangesAsync(ct);

        return template.Id;
    }

    public async Task<SurveyReportInfoDto?> GetReportInfoAsync(int surveyId, CancellationToken ct)
    {
        var info = await reportService.GetReportInfoAsync(surveyId, ct);
        if (info is null) return null;
        return new SurveyReportInfoDto(info.AnswerCount, info.AssignedCount, info.CompletedCount, info.AllAssignedCompleted);
    }

    public async Task<(System.IO.MemoryStream Stream, string FileName)?> BuildReportAsync(int surveyId, CancellationToken ct) =>
        await reportService.BuildReportAsync(surveyId, ct);

    public async Task<(string Csv, string FileName)?> BuildCsvReportAsync(int surveyId, CancellationToken ct) =>
        await csvReportService.BuildCsvAsync(surveyId, ct);

    public async Task<SendInvitesResult> SendInvitesAsync(int surveyId, int? reviewerId, CancellationToken ct) =>
        await inviteEmailService.SendInvitesAsync(surveyId, reviewerId, ct);
}
