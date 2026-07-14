using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;

namespace WebApp.Areas.Api;

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class DatabaseController(ApplicationDbContext context, IWebHostEnvironment env) : Controller
{
    [HttpDelete]
    public async Task<IActionResult> ClearAll(CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        await context.SurveyRespondentLinks.ExecuteDeleteAsync(ct);
        await context.SurveyAssignments.ExecuteDeleteAsync(ct);
        await context.Answers.ExecuteDeleteAsync(ct);
        await context.QuestionTemplates.ExecuteDeleteAsync(ct);
        await context.SurveyTemplates.ExecuteDeleteAsync(ct);
        await context.Set<WebApp.Models.SurveyParticipant>().ExecuteDeleteAsync(ct);
        await context.Questions.ExecuteDeleteAsync(ct);
        await context.Surveys.ExecuteDeleteAsync(ct);
        await context.Users.ExecuteDeleteAsync(ct);

        return NoContent();
    }
}
