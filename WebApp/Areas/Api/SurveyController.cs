using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

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

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class SurveyController(ApplicationDbContext context) : Controller
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
            .OrderBy(q => q.Id)
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

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Survey>> Update(int id, [FromBody] UpdateSurveyRequest request, CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (survey is null)
            return NotFound();

        survey.Name = request.Name;
        survey.Description = request.Description;
        survey.Status = request.Status;
        survey.StartedAt = request.StartedAt ?? default;
        survey.ClosedAt = request.ClosedAt ?? default;

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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await context.Surveys
            .Where(s => s.Id == id)
            .ExecuteDeleteAsync(ct);

        return deleted == 0 ? NotFound() : NoContent();
    }
}
