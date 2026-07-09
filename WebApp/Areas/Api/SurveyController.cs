using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Areas.Api;

public record SurveyDetailsDto(
    Survey Survey,
    List<Question> Questions,
    List<SurveyAssignment> Assignments
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
            .ToListAsync(ct);

        var assignments = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.SurveyId == id)
            .ToListAsync(ct);

        return new SurveyDetailsDto(survey, questions, assignments);
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
