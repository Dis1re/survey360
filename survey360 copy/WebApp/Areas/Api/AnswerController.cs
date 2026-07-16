using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;
using WebApp.Services;

namespace WebApp.Areas.Api;

public record CreateAnswerRequest(int QuestionId, int UserId, int TargetId, string Text);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class AnswerController(ApplicationDbContext context, InviteAccessService inviteAccess) : Controller
{
    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] CreateAnswerRequest request, CancellationToken ct)
    {
        var invite = await inviteAccess.ResolveFromRequestAsync(Request, ct);
        int reviewerId;
        if (invite is not null)
        {
            reviewerId = invite.ReviewerId;
        }
        else
        {
            var currentUserId = User.GetUserId();
            if (currentUserId is null)
                return Unauthorized();
            reviewerId = currentUserId.Value;
        }

        var question = await context.Questions
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, ct);
        if (question is null)
            return NotFound($"Вопрос с id {request.QuestionId} не найден");

        if (invite is not null && invite.SurveyId != question.SurveyId)
            return Forbid();

        var targetExists = await context.Users.AnyAsync(u => u.Id == request.TargetId, ct);
        if (!targetExists)
            return NotFound($"Пользователь с id {request.TargetId} не найден");

        var hasAssignment = await context.SurveyAssignments
            .AsNoTracking()
            .AnyAsync(a => a.SurveyId == question.SurveyId
                && a.ReviewerId == reviewerId
                && a.TargetId == request.TargetId
                && a.IsAssigned, ct);
        if (!hasAssignment)
            return Forbid();

        var existing = await context.Answers
            .FirstOrDefaultAsync(a => a.QuestionId == request.QuestionId
                && a.UserId == reviewerId && a.TargetId == request.TargetId, ct);

        if (existing is not null)
        {
            existing.Text = request.Text;
            await context.SaveChangesAsync(ct);
            return existing.Id;
        }

        var answer = new Answer
        {
            QuestionId = request.QuestionId,
            UserId = reviewerId,
            TargetId = request.TargetId,
            Text = request.Text,
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
