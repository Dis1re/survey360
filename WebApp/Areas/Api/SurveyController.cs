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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await context.Surveys
            .Where(s => s.Id == id)
            .ExecuteDeleteAsync(ct);

        return deleted == 0 ? NotFound() : NoContent();
    }
}
