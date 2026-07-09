using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Areas.Api;

public record CreateQuestionRequest(int SurveyId, string Text, string Type);

public record QuestionDetailsDto(Question Question, List<Answer> Answers);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class QuestionController(ApplicationDbContext context) : Controller
{
    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] CreateQuestionRequest request, CancellationToken ct)
    {
        var surveyExists = await context.Surveys.AnyAsync(s => s.Id == request.SurveyId, ct);
        if (!surveyExists)
            return NotFound($"Опрос с id {request.SurveyId} не найден");

        var question = new Question
        {
            SurveyId = request.SurveyId,
            Text = request.Text,
            Type = request.Type,
        };
        await context.Questions.AddAsync(question, ct);
        await context.SaveChangesAsync(ct);
        return question.Id;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<QuestionDetailsDto>> Get(int id, CancellationToken ct)
    {
        var question = await context.Questions
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == id, ct);

        if (question is null)
            return NotFound();

        var answers = await context.Answers
            .AsNoTracking()
            .Where(a => a.QuestionId == id)
            .ToListAsync(ct);

        return new QuestionDetailsDto(question, answers);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var questionExists = await context.Questions.AnyAsync(q => q.Id == id, ct);
        if (!questionExists)
            return NotFound();

        await context.Answers
            .Where(a => a.QuestionId == id)
            .ExecuteDeleteAsync(ct);

        await context.Questions
            .Where(q => q.Id == id)
            .ExecuteDeleteAsync(ct);

        return NoContent();
    }
}
