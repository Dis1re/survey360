using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;
using WebApp.Services;

namespace WebApp.Areas.Api;

public record CreateQuestionRequest(int SurveyId, string Text, string Type, bool IsRequired = false, string? Props = null);

public record UpdateQuestionRequest(string Text, string Type, bool IsRequired = false, string? Props = null);

public record QuestionDetailsDto(Question Question, List<Answer> Answers);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class QuestionController(ApplicationDbContext context) : Controller
{
    private bool CanManageSurvey(Survey survey)
    {
        var userId = User.GetUserId();
        if (userId is null) return false;
        return User.IsAdmin() || survey.CreatedByUserId == userId.Value;
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] CreateQuestionRequest request, CancellationToken ct)
    {
        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == request.SurveyId, ct);
        if (survey is null)
            return NotFound($"Опрос с id {request.SurveyId} не найден");

        if (!CanManageSurvey(survey))
            return Forbid();

        var maxOrder = await context.Questions
            .Where(q => q.SurveyId == request.SurveyId)
            .MaxAsync(q => (int?)q.Order) ?? -1;

        var question = new Question
        {
            SurveyId = request.SurveyId,
            Text = request.Text,
            Type = request.Type,
            IsRequired = request.IsRequired,
            Props = request.Props,
            Order = maxOrder + 1,
        };
        await context.Questions.AddAsync(question, ct);
        await context.SaveChangesAsync(ct);
        return question.Id;
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<QuestionDetailsDto>> Get(int id, CancellationToken ct)
    {
        var question = await context.Questions
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == id, ct);

        if (question is null)
            return NotFound();

        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == question.SurveyId, ct);
        if (survey is null) return NotFound();
        if (!CanManageSurvey(survey)) return Forbid();

        var answers = await context.Answers
            .AsNoTracking()
            .Where(a => a.QuestionId == id)
            .ToListAsync(ct);

        return new QuestionDetailsDto(question, answers);
    }

    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Question>> Update(int id, [FromBody] UpdateQuestionRequest request, CancellationToken ct)
    {
        var question = await context.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);
        if (question is null)
            return NotFound();

        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == question.SurveyId, ct);
        if (survey is null) return NotFound();
        if (!CanManageSurvey(survey)) return Forbid();
        if (SurveyService.IsSurveyActive(survey.Status))
            return BadRequest("Нельзя изменять вопросы активного опроса");

        question.Text = request.Text;
        question.Type = request.Type;
        question.IsRequired = request.IsRequired;
        if (request.Props is not null)
            question.Props = request.Props;

        await context.SaveChangesAsync(ct);
        return question;
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var question = await context.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);
        if (question is null)
            return NotFound();

        var survey = await context.Surveys.FirstOrDefaultAsync(s => s.Id == question.SurveyId, ct);
        if (survey is null) return NotFound();
        if (!CanManageSurvey(survey)) return Forbid();
        if (SurveyService.IsSurveyActive(survey.Status))
            return BadRequest("Нельзя удалять вопросы активного опроса");

        await context.Answers
            .Where(a => a.QuestionId == id)
            .ExecuteDeleteAsync(ct);

        await context.Questions
            .Where(q => q.Id == id)
            .ExecuteDeleteAsync(ct);

        return NoContent();
    }
}
