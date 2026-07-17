using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Hubs;
using WebApp.Models;
using WebApp.Services;

namespace WebApp.Areas.Api;

public record SurveyDetailsDto(
    Survey Survey,
    List<Question> Questions,
    List<Answer> Answers,
    List<SurveyAssignment> Assignments
);

public record UpdateSurveyRequest(
    string Name,
    string Description,
    string Status,
    DateTime? StartedAt,
    DateTime? ClosedAt
);

public record SurveyMatrixDto(
    List<User> Targets,
    List<User> Respondents,
    List<SurveyAssignment> Assignments
);

public record AddSurveyParticipantRequest(int UserId, string Role);

public record SaveAssignmentsRequest(List<AssignmentEntry> Entries);

public record AssignmentEntry(int ReviewerId, int TargetId, bool IsAssigned);

public record SurveyListItemDto(
    int Id,
    string Name,
    string Description,
    string Status,
    DateTime CreatedAt,
    DateTime StartedAt,
    DateTime ClosedAt,
    int? CreatedByUserId,
    int? MyAssignedCount,
    int? MyCompletedCount
);

public record CompleteAssignmentRequest(int ReviewerId, int TargetId);

public record SaveAsTemplateRequest(string Name, string Description);

public record SendInvitesRequest(int? ReviewerId);

public record SurveyReportInfoDto(int AnswerCount, int AssignedCount, int CompletedCount, bool AllAssignedCompleted);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class SurveyController(
    ApplicationDbContext context,
    SurveyDocxReportService reportService,
    SurveyCsvReportService csvReportService,
    SurveyXlsxReportService xlsxReportService,
    SurveyRespondentLinkService linkService,
    SurveyInviteEmailService inviteEmailService,
    AiSummaryService aiSummaryService,
    IHubContext<SurveyHub> surveyHub) : Controller
{
    private Task NotifySurveyUpdatedAsync(int surveyId, string? status, CancellationToken ct) =>
        surveyHub.Clients.All.SendAsync(
            SurveyLiveEvents.SurveyUpdated,
            new SurveyUpdatedPayload(surveyId, status ?? ""),
            ct);

    private static bool IsSurveyDraft(string status)
    {
        var normalized = status.Trim().ToLowerInvariant();
        return normalized.Contains("черновик") || normalized == "draft";
    }

    private bool CanManageSurvey(Survey survey)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return false;

        return User.IsAdmin() || survey.CreatedByUserId == userId.Value;
    }

    private async Task<bool> CanViewSurveyAsync(Survey survey, CancellationToken ct)
    {
        if (CanManageSurvey(survey))
            return true;

        var userId = User.GetUserId();
        if (userId is null || IsSurveyDraft(survey.Status))
            return false;

        return await context.SurveyAssignments
            .AsNoTracking()
            .AnyAsync(
                a => a.SurveyId == survey.Id && a.ReviewerId == userId.Value && a.IsAssigned,
                ct);
    }

    private ActionResult? RequireManageSurvey(Survey? survey)
    {
        if (survey is null)
            return NotFound();

        if (!CanManageSurvey(survey))
            return Forbid();

        return null;
    }

    private async Task<ActionResult?> RequireViewSurveyAsync(Survey? survey, CancellationToken ct)
    {
        if (survey is null)
            return NotFound();

        if (!await CanViewSurveyAsync(survey, ct))
            return Forbid();

        return null;
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<int>> Create(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null || !await context.Users.AnyAsync(u => u.Id == userId, ct))
            return Unauthorized("Пользователь не найден. Войдите заново.");

        var survey = new Survey
        {
            Name = "Новый опрос",
            Description = "",
            Status = "Черновик",
            CreatedAt = DateTime.UtcNow,
            StartedAt = default,
            ClosedAt = default,
            CreatedByUserId = userId,
        };
        await context.Surveys.AddAsync(survey, ct);
        await context.SaveChangesAsync(ct);
        return survey.Id;
    }

    [Authorize]
    [HttpGet]
    public async Task<IEnumerable<SurveyListItemDto>> List(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return [];

        var surveys = await context.Surveys.AsNoTracking().ToListAsync(ct);

        var myAssignments = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.ReviewerId == userId.Value && a.IsAssigned)
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
                s.CreatedByUserId == userId.Value ||
                (!IsSurveyDraft(s.Status) && respondentSurveyIdSet.Contains(s.Id)))
            .OrderByDescending(s => s.CreatedAt)
            .Select(s =>
            {
                statsBySurvey.TryGetValue(s.Id, out var stats);
                int? assigned = stats.Assigned > 0 ? stats.Assigned : null;
                int? completed = stats.Assigned > 0 ? stats.Completed : null;
                return new SurveyListItemDto(
                    s.Id,
                    s.Name,
                    s.Description,
                    s.Status,
                    s.CreatedAt,
                    s.StartedAt,
                    s.ClosedAt,
                    s.CreatedByUserId,
                    assigned,
                    completed);
            })
            .ToList();
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<SurveyDetailsDto>> Get(int id, CancellationToken ct)
    {
        var survey = await context.Surveys
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = await RequireViewSurveyAsync(survey, ct);
        if (accessError is not null)
            return accessError;

        var resolvedSurvey = survey!;
        var questions = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == id)
            .OrderBy(q => q.Order)
            .ThenBy(q => q.Id)
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

        return new SurveyDetailsDto(resolvedSurvey, questions, answers, assignments);
    }

    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Survey>> Update(int id, [FromBody] UpdateSurveyRequest request, CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var resolvedSurvey = survey!;
        var targetStatus = (request.Status ?? "").Trim();
        var isActive = targetStatus.Contains("актив", StringComparison.OrdinalIgnoreCase)
            || targetStatus.Equals("active", StringComparison.OrdinalIgnoreCase);

        if (isActive)
        {
            var hasQuestions = await context.Questions.AnyAsync(q => q.SurveyId == id, ct);
            var hasAssignments = await context.SurveyAssignments
                .AnyAsync(a => a.SurveyId == id && a.IsAssigned, ct);

            if (!hasQuestions || !hasAssignments)
            {
                return BadRequest(
                    "Нельзя запустить опрос: добавьте хотя бы один вопрос и заполните матрицу " +
                    "назначений (хотя бы одну пару «оценивающий → оцениваемый»).");
            }
        }

        resolvedSurvey.Name = request.Name;
        resolvedSurvey.Description = request.Description;
        resolvedSurvey.Status = request.Status;
        resolvedSurvey.StartedAt = request.StartedAt ?? default;
        resolvedSurvey.ClosedAt = request.ClosedAt ?? default;

        if (request.Status == "Активен")
            await linkService.SyncRespondentLinksAsync(id, ct);

        await context.SaveChangesAsync(ct);
        await NotifySurveyUpdatedAsync(id, resolvedSurvey.Status, ct);
        return resolvedSurvey;
    }

    [Authorize]
    [HttpGet("{id:int}/matrix")]
    public async Task<ActionResult<SurveyMatrixDto>> GetMatrix(int id, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = await RequireViewSurveyAsync(survey, ct);
        if (accessError is not null)
            return accessError;

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

    [Authorize]
    [HttpPost("{id:int}/participants")]
    public async Task<IActionResult> AddParticipant(
        int id,
        [FromBody] AddSurveyParticipantRequest request,
        CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        if (!IsSurveyDraft(survey!.Status))
            return BadRequest("Добавлять участников можно только в черновике опроса");

        if (!await context.Users.AnyAsync(u => u.Id == request.UserId, ct))
            return NotFound($"Пользователь с id {request.UserId} не найден");

        var role = request.Role.Trim().ToLowerInvariant();
        if (role is not ("target" or "respondent"))
            return BadRequest("Role должен быть target или respondent");

        var participant = await context.Set<SurveyParticipant>()
            .FirstOrDefaultAsync(p => p.SurveyId == id && p.UserId == request.UserId, ct);

        if (participant is null)
        {
            participant = new SurveyParticipant { SurveyId = id, UserId = request.UserId };
            await context.Set<SurveyParticipant>().AddAsync(participant, ct);
        }

        if (role == "target")
            participant.IsTarget = true;
        else
            participant.IsRespondent = true;

        await context.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id:int}/participants")]
    public async Task<IActionResult> RemoveParticipant(
        int id,
        [FromQuery] int userId,
        [FromQuery] string role,
        CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        if (!IsSurveyDraft(survey!.Status))
            return BadRequest("Удалять участников можно только в черновике опроса");

        var roleNormalized = role.Trim().ToLowerInvariant();
        if (roleNormalized is not ("target" or "respondent"))
            return BadRequest("Role должен быть target или respondent");

        if (!await context.Users.AnyAsync(u => u.Id == userId, ct))
            return NotFound($"Пользователь с id {userId} не найден");

        var participant = await context.Set<SurveyParticipant>()
            .FirstOrDefaultAsync(p => p.SurveyId == id && p.UserId == userId, ct);

        if (participant is null)
            return NoContent();

        if (roleNormalized == "target")
            participant.IsTarget = false;
        else
        {
            participant.IsRespondent = false;
            await linkService.DeleteLinkAsync(id, userId, ct);
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
            .Where(a => a.SurveyId == id &&
                ((roleNormalized == "target" && a.TargetId == userId) ||
                 (roleNormalized == "respondent" && a.ReviewerId == userId)))
            .ExecuteDeleteAsync(ct);

        return NoContent();
    }

    [Authorize]
    [HttpPut("{id:int}/assignments")]
    public async Task<IActionResult> SaveAssignments(
        int id,
        [FromBody] SaveAssignmentsRequest request,
        CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var participants = await context.Set<SurveyParticipant>()
            .AsNoTracking()
            .Where(p => p.SurveyId == id)
            .ToListAsync(ct);

        var targetIds = participants.Where(p => p.IsTarget).Select(p => p.UserId).ToHashSet();
        var respondentIds = participants.Where(p => p.IsRespondent).Select(p => p.UserId).ToHashSet();

        await context.SurveyAssignments
            .Where(a => a.SurveyId == id)
            .ExecuteDeleteAsync(ct);

        foreach (var entry in request.Entries.Where(e => e.IsAssigned))
        {
            if (!respondentIds.Contains(entry.ReviewerId) || !targetIds.Contains(entry.TargetId))
                continue;

            await context.SurveyAssignments.AddAsync(new SurveyAssignment
            {
                SurveyId = id,
                ReviewerId = entry.ReviewerId,
                TargetId = entry.TargetId,
                IsAssigned = true,
                IsCompleted = false,
            }, ct);
        }

        await context.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("{id:int}/save-as-template")]
    public async Task<ActionResult<int>> SaveAsTemplate(
        int id,
        [FromBody] SaveAsTemplateRequest request,
        CancellationToken ct)
    {
        var survey = await context.Surveys
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var questions = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == id)
            .OrderBy(q => q.Id)
            .ToListAsync(ct);

        if (questions.Count == 0)
            return BadRequest("Нельзя создать шаблон без вопросов");

        var template = new SurveyTemplate
        {
            Name = request.Name,
            Description = request.Description,
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

    [Authorize]
    [HttpPost("{id:int}/duplicate")]
    public async Task<ActionResult<int>> Duplicate(int id, CancellationToken ct)
    {
        var source = await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(source);
        if (accessError is not null)
            return accessError;

        var userId = User.GetUserId();

        var newSurvey = new Survey
        {
            Name = source!.Name + " (копия)",
            Description = source.Description,
            Status = "Черновик",
            CreatedAt = DateTime.UtcNow,
            StartedAt = default,
            ClosedAt = default,
            CreatedByUserId = userId,
        };
        await context.Surveys.AddAsync(newSurvey, ct);
        await context.SaveChangesAsync(ct);

        var questions = await context.Questions
            .Where(q => q.SurveyId == id)
            .OrderBy(q => q.Order)
            .ToListAsync(ct);

        foreach (var q in questions)
        {
            context.Questions.Add(new Question
            {
                SurveyId = newSurvey.Id,
                Text = q.Text,
                Type = q.Type,
                IsRequired = q.IsRequired,
                Props = q.Props,
                Order = q.Order,
            });
        }

        var participants = await context.SurveyParticipants
            .Where(p => p.SurveyId == id)
            .ToListAsync(ct);

        foreach (var p in participants)
        {
            context.SurveyParticipants.Add(new SurveyParticipant
            {
                SurveyId = newSurvey.Id,
                UserId = p.UserId,
                IsTarget = p.IsTarget,
                IsRespondent = p.IsRespondent,
            });
        }

        var assignments = await context.SurveyAssignments
            .Where(a => a.SurveyId == id)
            .ToListAsync(ct);

        foreach (var a in assignments)
        {
            context.SurveyAssignments.Add(new SurveyAssignment
            {
                SurveyId = newSurvey.Id,
                ReviewerId = a.ReviewerId,
                TargetId = a.TargetId,
                IsAssigned = a.IsAssigned,
                IsCompleted = false,
            });
        }

        await context.SaveChangesAsync(ct);
        return newSurvey.Id;
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var status = (survey!.Status ?? "").Trim();
        var isActive = status.Contains("актив", StringComparison.OrdinalIgnoreCase)
            || status.Equals("active", StringComparison.OrdinalIgnoreCase);
        if (isActive)
            return BadRequest("Нельзя удалить активный опрос. Сначала завершите его.");

        var deleted = await context.Surveys
            .Where(s => s.Id == id)
            .ExecuteDeleteAsync(ct);

        return deleted == 0 ? NotFound() : NoContent();
    }

    public record ReorderQuestionsRequest(List<int> OrderedIds);

    [Authorize]
    [HttpPut("{id:int}/questions/order")]
    public async Task<IActionResult> ReorderQuestions(
        int id,
        [FromBody] ReorderQuestionsRequest request,
        CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var ids = request.OrderedIds.Distinct().ToList();
        if (ids.Count == 0)
            return NoContent();

        var questions = await context.Questions
            .Where(q => q.SurveyId == id)
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
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id:int}/questions")]
    public async Task<IActionResult> DeleteAllQuestions(int id, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var questionIds = await context.Questions
            .Where(q => q.SurveyId == id)
            .Select(q => q.Id)
            .ToListAsync(ct);

        if (questionIds.Count > 0)
        {
            await context.Answers
                .Where(a => questionIds.Contains(a.QuestionId))
                .ExecuteDeleteAsync(ct);

            await context.Questions
                .Where(q => q.SurveyId == id)
                .ExecuteDeleteAsync(ct);
        }

        return NoContent();
    }

    [Authorize]
    [HttpPost("{id:int}/assignments/complete")]
    public async Task<IActionResult> CompleteAssignment(
        int id,
        [FromBody] CompleteAssignmentRequest request,
        CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null)
            return NotFound();

        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        if (!User.IsAdmin() && request.ReviewerId != userId.Value)
            return Forbid();

        if (request.ReviewerId <= 0 || request.TargetId <= 0)
            return BadRequest("ReviewerId и TargetId обязательны");

        var assignment = await context.SurveyAssignments
            .FirstOrDefaultAsync(
                a => a.SurveyId == id && a.ReviewerId == request.ReviewerId && a.TargetId == request.TargetId,
                ct);

        if (assignment is null || !assignment.IsAssigned)
            return BadRequest("Назначение не найдено в матрице опроса");

        var requiredQuestions = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == id && q.IsRequired)
            .ToListAsync(ct);

        if (requiredQuestions.Count > 0)
        {
            var requiredIds = requiredQuestions.Select(q => q.Id).ToHashSet();
            var answeredRequiredIds = await context.Answers
                .AsNoTracking()
                .Where(a => a.UserId == request.ReviewerId
                            && a.TargetId == request.TargetId
                            && requiredIds.Contains(a.QuestionId)
                            && a.Text != null && a.Text != "")
                .Select(a => a.QuestionId)
                .ToListAsync(ct);

            var missing = requiredQuestions
                .Where(q => !answeredRequiredIds.Contains(q.Id))
                .Select(q => new { q.Id, q.Text })
                .ToList();

            if (missing.Count > 0)
            {
                return BadRequest(new
                {
                    message = "Не заполнены обязательные вопросы",
                    missingQuestionIds = missing.Select(m => m.Id).ToList(),
                });
            }
        }

        assignment.IsCompleted = true;

        await context.SaveChangesAsync(ct);

        var assignedPairs = await context.SurveyAssignments
            .Where(a => a.SurveyId == id && a.IsAssigned)
            .ToListAsync(ct);

        if (assignedPairs.Count > 0 && assignedPairs.All(a => a.IsCompleted))
        {
            survey.Status = "Завершен";
            survey.ClosedAt = DateTime.UtcNow;
            await context.SaveChangesAsync(ct);

            _ = Task.Run(async () =>
            {
                try { await aiSummaryService.GenerateOverallAsync(id); }
                catch (Exception ex) { /* best-effort */ }
            });
        }

        await NotifySurveyUpdatedAsync(id, survey.Status, ct);
        return NoContent();
    }

    [Authorize]
    [HttpGet("{id:int}/report/info")]
    public async Task<ActionResult<SurveyReportInfoDto>> GetReportInfo(int id, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var info = await reportService.GetReportInfoAsync(id, ct);
        if (info is null)
            return NotFound();

        return new SurveyReportInfoDto(
            info.AnswerCount,
            info.AssignedCount,
            info.CompletedCount,
            info.AllAssignedCompleted);
    }

    [Authorize]
    [HttpGet("{id:int}/report.docx")]
    public async Task<IActionResult> DownloadReport(
        int id,
        CancellationToken ct,
        [FromQuery] int? reviewerId,
        [FromQuery] int? targetId)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var result = await reportService.BuildReportAsync(id, ct, reviewerId, targetId);
        if (result is null)
        {
            var exists = await context.Surveys.AnyAsync(s => s.Id == id, ct);
            if (!exists)
                return NotFound();

            return BadRequest("Нет ответов для формирования отчёта");
        }

        const string contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return File(result.Value.Bytes, contentType, result.Value.FileName);
    }

    [Authorize]
    [HttpGet("{id:int}/report-by-question.docx")]
    public async Task<IActionResult> DownloadReportByQuestion(
        int id,
        CancellationToken ct,
        [FromQuery] int? reviewerId,
        [FromQuery] int? targetId)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var result = await reportService.BuildReportByQuestionAsync(id, ct, reviewerId, targetId);
        if (result is null)
        {
            var exists = await context.Surveys.AnyAsync(s => s.Id == id, ct);
            if (!exists)
                return NotFound();

            return BadRequest("Нет ответов для формирования отчёта");
        }

        const string contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return File(result.Value.Bytes, contentType, result.Value.FileName);
    }

    [HttpGet("{id:int}/report.csv")]
    public async Task<IActionResult> DownloadCsvReport(
        int id,
        CancellationToken ct,
        [FromQuery] int? reviewerId,
        [FromQuery] int? targetId)
    {
        var result = await csvReportService.BuildCsvAsync(id, ct, reviewerId, targetId);
        if (result is null)
        {
            var exists = await context.Surveys.AnyAsync(s => s.Id == id, ct);
            if (!exists)
                return NotFound();

            return BadRequest("Нет ответов для формирования отчёта");
        }

        var preamble = System.Text.Encoding.UTF8.GetPreamble();
        var body = System.Text.Encoding.UTF8.GetBytes(result.Value.Csv);
        var bytes = new byte[preamble.Length + body.Length];
        Array.Copy(preamble, 0, bytes, 0, preamble.Length);
        Array.Copy(body, 0, bytes, preamble.Length, body.Length);

        return File(bytes, "text/csv; charset=utf-8", result.Value.FileName);
    }

    [HttpGet("{id:int}/report.xlsx")]
    public async Task<IActionResult> DownloadXlsxReport(
        int id,
        CancellationToken ct,
        [FromQuery] int? reviewerId,
        [FromQuery] int? targetId)
    {
        var result = await xlsxReportService.BuildXlsxAsync(id, ct, reviewerId, targetId);
        if (result is null)
        {
            var exists = await context.Surveys.AnyAsync(s => s.Id == id, ct);
            if (!exists)
                return NotFound();

            return BadRequest("Нет ответов для формирования отчёта");
        }

        return File(result.Value.Bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", result.Value.FileName);
    }

    public record ResponseItemDto(string QuestionText, string AnswerText);

    public record TargetResponseDto(
        int QuestionOrder,
        string QuestionText,
        List<ReviewerAnswerDto> Answers);

    public record ReviewerAnswerDto(int ReviewerId, string ReviewerName, string AnswerText);

    public record RespondentResponseDto(
        int TargetId,
        string TargetName,
        List<QuestionAnswerDto> Questions);

    public record QuestionAnswerDto(int QuestionOrder, string QuestionText, string AnswerText);

    [HttpGet("{id:int}/responses/{reviewerId:int}/{targetId:int}")]
    public async Task<ActionResult<List<ResponseItemDto>>> GetResponses(
        int id, int reviewerId, int targetId, CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

        var items = await context.Answers
            .AsNoTracking()
            .Where(a => a.UserId == reviewerId
                && a.TargetId == targetId)
            .Join(
                context.Questions.AsNoTracking(),
                a => a.QuestionId,
                q => q.Id,
                (a, q) => new { q.Order, QuestionText = q.Text, AnswerText = a.Text, q.SurveyId })
            .Where(x => x.SurveyId == id)
            .OrderBy(x => x.Order)
            .ThenBy(x => x.QuestionText)
            .Select(x => new ResponseItemDto(x.QuestionText, x.AnswerText))
            .ToListAsync(ct);

        return items;
    }

    [HttpGet("{id:int}/responses/target/{targetId:int}")]
    public async Task<ActionResult<List<TargetResponseDto>>> GetTargetResponses(
        int id, int targetId, CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

        var surveyAnswers = await context.Answers.AsNoTracking()
            .Join(
                context.Questions.AsNoTracking(),
                a => a.QuestionId,
                q => q.Id,
                (a, q) => new { a.TargetId, a.UserId, a.Text, Question = q })
            .Where(x => x.TargetId == targetId && x.Question.SurveyId == id)
            .ToListAsync(ct);

        var respondents = await context.Users.AsNoTracking()
            .Select(u => new { u.Id, u.Name })
            .ToListAsync(ct);

        var nameById = respondents.ToDictionary(r => r.Id, r => r.Name);

        var grouped = surveyAnswers
            .GroupBy(x => new { x.Question.Order, x.Question.Text })
            .OrderBy(g => g.Key.Order)
            .ThenBy(g => g.Key.Text)
            .Select(g => new TargetResponseDto(
                g.Key.Order,
                g.Key.Text,
                g.Select(x => new ReviewerAnswerDto(
                    x.UserId,
                    nameById.GetValueOrDefault(x.UserId, $"Пользователь #{x.UserId}"),
                    SurveyAnswerFormatter.FormatSelectedPlain(x.Question, x.Text))).ToList()))
            .ToList();

        return grouped;
    }

    [HttpGet("{id:int}/responses/reviewer/{reviewerId:int}")]
    public async Task<ActionResult<List<RespondentResponseDto>>> GetReviewerResponses(
        int id, int reviewerId, CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

        var surveyAnswers = await context.Answers.AsNoTracking()
            .Join(
                context.Questions.AsNoTracking(),
                a => a.QuestionId,
                q => q.Id,
                (a, q) => new { a.TargetId, a.UserId, a.Text, Question = q })
            .Where(x => x.UserId == reviewerId && x.Question.SurveyId == id)
            .ToListAsync(ct);

        var targets = await context.Users.AsNoTracking()
            .Select(u => new { u.Id, u.Name })
            .ToListAsync(ct);

        var nameById = targets.ToDictionary(t => t.Id, t => t.Name);

        var grouped = surveyAnswers
            .GroupBy(x => x.TargetId)
            .OrderBy(g => nameById.GetValueOrDefault(g.Key, $"Пользователь #{g.Key}"))
            .Select(g => new RespondentResponseDto(
                g.Key,
                nameById.GetValueOrDefault(g.Key, $"Пользователь #{g.Key}"),
                g.GroupBy(q => new { q.Question.Order, q.Question.Text })
                    .OrderBy(qg => qg.Key.Order)
                    .ThenBy(qg => qg.Key.Text)
                    .Select(qg => new QuestionAnswerDto(
                        qg.Key.Order,
                        qg.Key.Text,
                        SurveyAnswerFormatter.FormatSelectedPlain(qg.First().Question, qg.First().Text)))
                    .ToList()))
            .ToList();

        return grouped;
    }

    [Authorize]
    [HttpGet("{id:int}/links")]
    public async Task<ActionResult<List<RespondentLinkDto>>> GetRespondentLinks(int id, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        return await linkService.GetLinksAsync(id, ct);
    }

    [Authorize]
    [HttpPost("{id:int}/send-invites")]
    public async Task<ActionResult<SendInvitesResult>> SendInvites(
        int id,
        [FromBody] SendInvitesRequest? request,
        CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        try
        {
            var result = await inviteEmailService.SendInvitesAsync(id, request?.ReviewerId, ct);
            return result;
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("invite/{token}")]
    public async Task<ActionResult<InviteInfoDto>> ResolveInvite(string token, CancellationToken ct)
    {
        var info = await linkService.ResolveTokenAsync(token, ct);
        return info is null ? NotFound() : info;
    }

    [Authorize]
    [HttpGet("{id:int}/ai-summary")]
    public async Task<ActionResult<AiSummaryDto>> GetAiSummary(
        int id,
        [FromQuery] string type = "overall",
        CancellationToken ct = default)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        var summary = await aiSummaryService.GetAsync(id, type);
        if (summary == null) return NotFound();

        return new AiSummaryDto(summary.SummaryType, summary.Content, summary.CreatedAt, summary.UpdatedAt);
    }

    [Authorize]
    [HttpPost("{id:int}/ai-summary/generate")]
    public async Task<ActionResult<AiSummaryDto>> GenerateAiSummary(
        int id,
        [FromQuery] string type = "overall",
        [FromQuery] int? targetId = null,
        CancellationToken ct = default)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        AiSummary? result;
        if (type == "overall")
        {
            result = await aiSummaryService.GenerateOverallAsync(id, ct);
        }
        else if (type.StartsWith("target_") && targetId.HasValue)
        {
            result = await aiSummaryService.GenerateTargetAsync(id, targetId.Value, ct);
        }
        else if (type.StartsWith("reviewer_") && targetId.HasValue)
        {
            result = await aiSummaryService.GenerateReviewerAsync(id, targetId.Value, ct);
        }
        else
        {
            return BadRequest(new { message = "Invalid summary type or missing targetId" });
        }

        if (result == null)
            return BadRequest(new { message = "Failed to generate summary. Check AI configuration." });

        return new AiSummaryDto(result.SummaryType, result.Content, result.CreatedAt, result.UpdatedAt);
    }

    [Authorize]
    [HttpDelete("{id:int}/ai-summary")]
    public async Task<IActionResult> DeleteAiSummary(
        int id,
        [FromQuery] string type = "overall",
        CancellationToken ct = default)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null)
            return accessError;

        await aiSummaryService.DeleteAsync(id, type, ct);
        return NoContent();
    }
}

public record AiSummaryDto(string SummaryType, string Content, DateTime CreatedAt, DateTime UpdatedAt);
