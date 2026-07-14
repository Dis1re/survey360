using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Areas.Api;

public record CreateAnswerRequest(int QuestionId, int UserId, int TargetId, string Text, string Type);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class AnswerController(ApplicationDbContext context) : Controller
{
    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] CreateAnswerRequest request, CancellationToken ct)
    {
        var questionExists = await context.Questions.AnyAsync(q => q.Id == request.QuestionId, ct);
        if (!questionExists)
            return NotFound($"Вопрос с id {request.QuestionId} не найден");

        var userExists = await context.Users.AnyAsync(u => u.Id == request.UserId, ct);
        if (!userExists)
            return NotFound($"Пользователь с id {request.UserId} не найден");

        if (request.TargetId <= 0)
            return BadRequest("TargetId обязателен");

        var targetExists = await context.Users.AnyAsync(u => u.Id == request.TargetId, ct);
        if (!targetExists)
            return NotFound($"Пользователь с id {request.TargetId} не найден");

        var existing = await context.Answers
            .FirstOrDefaultAsync(a => a.QuestionId == request.QuestionId
                && a.UserId == request.UserId && a.TargetId == request.TargetId, ct);

        if (existing is not null)
        {
            existing.Text = request.Text;
            existing.Type = request.Type;
            await context.SaveChangesAsync(ct);
            return existing.Id;
        }

        var answer = new Answer
        {
            QuestionId = request.QuestionId,
            UserId = request.UserId,
            TargetId = request.TargetId,
            Text = request.Text,
            Type = request.Type,
        };
        await context.Answers.AddAsync(answer, ct);
        await context.SaveChangesAsync(ct);
        return answer.Id;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Answer>> Get(int id, CancellationToken ct)
    {
        var answer = await context.Answers
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        return answer is null ? NotFound() : answer;
    }
}
