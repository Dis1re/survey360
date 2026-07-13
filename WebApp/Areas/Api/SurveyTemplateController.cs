using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Areas.Api;

public record CreateSurveyTemplateRequest(string Name, string Description, string Props);

public record UpdateSurveyTemplateRequest(string Name, string Description, string Props);

public record CreateQuestionTemplateRequest(string Text, string Type);

public record UpdateQuestionTemplateRequest(string Text, string Type);

public record SurveyTemplateDetailsDto(
    SurveyTemplate Template,
    List<QuestionTemplate> Questions
);

[Area("api")]
[ApiController]
[Route("/api/survey-template")]
public class SurveyTemplateController(ApplicationDbContext context) : Controller
{
    [HttpPost]
    public async Task<int> Create([FromBody] CreateSurveyTemplateRequest request, CancellationToken ct)
    {
        var template = new SurveyTemplate
        {
            Name = request.Name,
            Description = request.Description,
            Props = request.Props,
            CreatedAt = DateTime.UtcNow,
        };
        await context.SurveyTemplates.AddAsync(template, ct);
        await context.SaveChangesAsync(ct);
        return template.Id;
    }

    [HttpGet]
    public async Task<IEnumerable<SurveyTemplate>> List(CancellationToken ct)
    {
        return await context.SurveyTemplates
            .AsNoTracking()
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SurveyTemplateDetailsDto>> Get(int id, CancellationToken ct)
    {
        var template = await context.SurveyTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (template is null)
            return NotFound();

        var questions = await context.QuestionTemplates
            .AsNoTracking()
            .Where(qt => qt.SurveyTemplateId == id)
            .OrderBy(qt => qt.Id)
            .ToListAsync(ct);

        return new SurveyTemplateDetailsDto(template, questions);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SurveyTemplate>> Update(int id, [FromBody] UpdateSurveyTemplateRequest request, CancellationToken ct)
    {
        var template = await context.SurveyTemplates.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (template is null)
            return NotFound();

        template.Name = request.Name;
        template.Description = request.Description;
        template.Props = request.Props;

        await context.SaveChangesAsync(ct);
        return template;
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await context.SurveyTemplates
            .Where(t => t.Id == id)
            .ExecuteDeleteAsync(ct);

        return deleted == 0 ? NotFound() : NoContent();
    }

    [HttpPost("{id:int}/questions")]
    public async Task<ActionResult<int>> CreateQuestion(int id, [FromBody] CreateQuestionTemplateRequest request, CancellationToken ct)
    {
        if (!await context.SurveyTemplates.AnyAsync(t => t.Id == id, ct))
            return NotFound();

        var question = new QuestionTemplate
        {
            SurveyTemplateId = id,
            Text = request.Text,
            Type = request.Type,
        };
        await context.QuestionTemplates.AddAsync(question, ct);
        await context.SaveChangesAsync(ct);
        return question.Id;
    }

    [HttpPut("{id:int}/questions/{questionId:int}")]
    public async Task<IActionResult> UpdateQuestion(
        int id,
        int questionId,
        [FromBody] UpdateQuestionTemplateRequest request,
        CancellationToken ct)
    {
        var question = await context.QuestionTemplates
            .FirstOrDefaultAsync(qt => qt.Id == questionId && qt.SurveyTemplateId == id, ct);
        if (question is null)
            return NotFound();

        question.Text = request.Text;
        question.Type = request.Type;

        await context.SaveChangesAsync(ct);
        return Ok(question);
    }

    [HttpDelete("{id:int}/questions/{questionId:int}")]
    public async Task<IActionResult> DeleteQuestion(int id, int questionId, CancellationToken ct)
    {
        var deleted = await context.QuestionTemplates
            .Where(qt => qt.Id == questionId && qt.SurveyTemplateId == id)
            .ExecuteDeleteAsync(ct);

        return deleted == 0 ? NotFound() : NoContent();
    }

    [HttpPost("{id:int}/create-survey")]
    public async Task<IActionResult> CreateSurveyFromTemplate(int id, CancellationToken ct)
    {
        var template = await context.SurveyTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (template is null)
            return NotFound();

        var templateQuestions = await context.QuestionTemplates
            .AsNoTracking()
            .Where(qt => qt.SurveyTemplateId == id)
            .OrderBy(qt => qt.Id)
            .ToListAsync(ct);

        var survey = new Survey
        {
            Name = template.Name,
            Description = template.Description,
            Status = "Черновик",
            CreatedAt = DateTime.UtcNow,
            StartedAt = default,
            ClosedAt = default,
        };
        await context.Surveys.AddAsync(survey, ct);
        await context.SaveChangesAsync(ct);

        foreach (var qt in templateQuestions)
        {
            context.Questions.Add(new Question
            {
                SurveyId = survey.Id,
                Text = qt.Text,
                Type = qt.Type,
            });
        }
        await context.SaveChangesAsync(ct);

        return Ok(survey.Id);
    }
}
