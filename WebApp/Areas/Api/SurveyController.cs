using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
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

public record CompleteAssignmentRequest(int ReviewerId, int TargetId);

public record SaveAsTemplateRequest(string Name, string Description);

public record SurveyReportInfoDto(int AnswerCount, int AssignedCount, int CompletedCount, bool AllAssignedCompleted);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class SurveyController(
    ApplicationDbContext context,
    SurveyDocxReportService reportService,
    SurveyRespondentLinkService linkService) : Controller
{
    [HttpPost]
    public async Task<int> Create(CancellationToken ct)
    {
        var survey = new Survey
        {
            Name = "Новый опрос",
            Description = "",
            Status = "Черновик",
            CreatedAt = DateTime.UtcNow,
            StartedAt = default,
            ClosedAt = default,
        };
        await context.Surveys.AddAsync(survey, ct);
        await context.SaveChangesAsync(ct);
        return survey.Id;
    }

    [HttpGet]
    public async Task<IEnumerable<Survey>> List(CancellationToken ct)
    {
        return await context.Surveys
            .AsNoTracking()
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SurveyDetailsDto>> Get(int id, CancellationToken ct)
    {
        var survey = await context.Surveys
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null)
            return NotFound();

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

        return new SurveyDetailsDto(survey, questions, answers, assignments);
    }
    
    [HttpGet("{id:int}/v2")]
    public async Task<ActionResult<SurveyDetailsDto>> GetV2(int id, CancellationToken ct)
    {
        var survey = await context.Surveys
            .AsNoTracking()
            .Include(s => s.Questions)
                .ThenInclude(q => q.Answers)
            .Include(s => s.Assignments)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (survey is null)
            return NotFound();
        
        var questions = survey.Questions
            .OrderBy(q => q.Order)
            .ThenBy(q => q.Id)
            .ToList();

        var answers = questions.SelectMany(q => q.Answers).ToList();

        return new SurveyDetailsDto(survey, questions, answers, survey.Assignments);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Survey>> Update(int id, [FromBody] UpdateSurveyRequest request, CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null)
            return NotFound();

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

        survey.Name = request.Name;
        survey.Description = request.Description;
        survey.Status = request.Status;
        survey.StartedAt = request.StartedAt ?? default;
        survey.ClosedAt = request.ClosedAt ?? default;

        if (request.Status == "Активен")
            await linkService.SyncRespondentLinksAsync(id, ct);

        await context.SaveChangesAsync(ct);
        return survey;
    }

    [HttpGet("{id:int}/matrix")]
    public async Task<ActionResult<SurveyMatrixDto>> GetMatrix(int id, CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

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

    [HttpPost("{id:int}/participants")]
    public async Task<IActionResult> AddParticipant(
        int id,
        [FromBody] AddSurveyParticipantRequest request,
        CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

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

    [HttpDelete("{id:int}/participants")]
    public async Task<IActionResult> RemoveParticipant(
        int id,
        [FromQuery] int userId,
        [FromQuery] string role,
        CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

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

    [HttpPut("{id:int}/assignments")]
    public async Task<IActionResult> SaveAssignments(
        int id,
        [FromBody] SaveAssignmentsRequest request,
        CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

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

    [HttpPost("{id:int}/save-as-template")]
    public async Task<ActionResult<int>> SaveAsTemplate(
        int id,
        [FromBody] SaveAsTemplateRequest request,
        CancellationToken ct)
    {
        var survey = await context.Surveys
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null)
            return NotFound();

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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await context.Surveys
            .Where(s => s.Id == id)
            .ExecuteDeleteAsync(ct);

        return deleted == 0 ? NotFound() : NoContent();
    }

    public record ReorderQuestionsRequest(List<int> OrderedIds);

    [HttpPut("{id:int}/questions/order")]
    public async Task<IActionResult> ReorderQuestions(
        int id,
        [FromBody] ReorderQuestionsRequest request,
        CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

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

    [HttpPost("{id:int}/assignments/complete")]
    public async Task<IActionResult> CompleteAssignment(
        int id,
        [FromBody] CompleteAssignmentRequest request,
        CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null)
            return NotFound();

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
        }

        return NoContent();
    }

    [HttpGet("{id:int}/report/info")]
    public async Task<ActionResult<SurveyReportInfoDto>> GetReportInfo(int id, CancellationToken ct)
    {
        var info = await reportService.GetReportInfoAsync(id, ct);
        if (info is null)
            return NotFound();

        return new SurveyReportInfoDto(
            info.AnswerCount,
            info.AssignedCount,
            info.CompletedCount,
            info.AllAssignedCompleted);
    }

    [HttpGet("{id:int}/report.docx")]
    public async Task<IActionResult> DownloadReport(int id, CancellationToken ct)
    {
        var result = await reportService.BuildReportAsync(id, ct);
        if (result is null)
        {
            var exists = await context.Surveys.AnyAsync(s => s.Id == id, ct);
            if (!exists)
                return NotFound();

            return BadRequest("Нет ответов для формирования отчёта");
        }

        const string contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return File(result.Value.Stream, contentType, result.Value.FileName);
    }

    [HttpGet("{id:int}/links")]
    public async Task<ActionResult<List<RespondentLinkDto>>> GetRespondentLinks(int id, CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == id, ct))
            return NotFound();

        return await linkService.GetLinksAsync(id, ct);
    }

    [HttpGet("invite/{token}")]
    public async Task<ActionResult<InviteInfoDto>> ResolveInvite(string token, CancellationToken ct)
    {
        var info = await linkService.ResolveTokenAsync(token, ct);
        return info is null ? NotFound() : info;
    }
}
