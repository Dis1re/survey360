using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Hubs;
using WebApp.Models;
using WebApp.Services;

namespace WebApp.Areas.Api;

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class SurveyController(
    ApplicationDbContext context,
    SurveyService surveyService,
    SurveyRespondentLinkService linkService,
    IHubContext<SurveyHub> surveyHub) : Controller
{
    private Task NotifySurveyUpdatedAsync(int surveyId, string? status, CancellationToken ct) =>
        surveyHub.Clients.All.SendAsync(
            SurveyLiveEvents.SurveyUpdated,
            new SurveyUpdatedPayload(surveyId, status ?? ""),
            ct);

    private bool CanManageSurvey(Survey survey)
    {
        var userId = User.GetUserId();
        if (userId is null) return false;
        return User.IsAdmin() || survey.CreatedByUserId == userId.Value;
    }

    private async Task<bool> CanViewSurveyAsync(Survey survey, CancellationToken ct)
    {
        if (CanManageSurvey(survey)) return true;
        var userId = User.GetUserId();
        if (userId is null || SurveyService.IsSurveyDraft(survey.Status)) return false;
        return await context.SurveyAssignments
            .AsNoTracking()
            .AnyAsync(a => a.SurveyId == survey.Id && a.ReviewerId == userId.Value && a.IsAssigned, ct);
    }

    private ActionResult? RequireManageSurvey(Survey? survey)
    {
        if (survey is null) return NotFound();
        if (!CanManageSurvey(survey)) return Forbid();
        return null;
    }

    private async Task<ActionResult?> RequireViewSurveyAsync(Survey? survey, CancellationToken ct)
    {
        if (survey is null) return NotFound();
        if (!await CanViewSurveyAsync(survey, ct)) return Forbid();
        return null;
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<int>> Create(CancellationToken ct) =>
        await surveyService.CreateSurveyAsync(User.GetUserId(), ct);

    [Authorize]
    [HttpGet]
    public async Task<IEnumerable<SurveyListItemDto>> List(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return [];
        return await surveyService.ListSurveysAsync(userId.Value, ct);
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<SurveyDetailsDto>> Get(int id, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = await RequireViewSurveyAsync(survey, ct);
        if (accessError is not null) return accessError;

        var details = await surveyService.GetSurveyDetailsAsync(id, ct);
        return details is null ? NotFound() : details;
    }

    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Survey>> Update(int id, [FromBody] UpdateSurveyRequest request, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        var updated = await surveyService.UpdateSurveyAsync(id, request, ct);
        if (updated is null)
            return BadRequest("Нельзя запустить опрос: добавьте хотя бы один вопрос и заполните матрицу " +
                "назначений (хотя бы одну пару «оценивающий → оцениваемый»).");

        await NotifySurveyUpdatedAsync(id, updated.Status, ct);
        return updated;
    }

    [Authorize]
    [HttpGet("{id:int}/matrix")]
    public async Task<ActionResult<SurveyMatrixDto>> GetMatrix(int id, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = await RequireViewSurveyAsync(survey, ct);
        if (accessError is not null) return accessError;

        var matrix = await surveyService.GetMatrixAsync(id, ct);
        return matrix is null ? NotFound() : matrix;
    }

    [Authorize]
    [HttpPost("{id:int}/participants")]
    public async Task<IActionResult> AddParticipant(
        int id, [FromBody] AddSurveyParticipantRequest request, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        if (!SurveyService.IsSurveyDraft(survey!.Status))
            return BadRequest("Добавлять участников можно только в черновике опроса");

        if (!await context.Users.AnyAsync(u => u.Id == request.UserId, ct))
            return NotFound($"Пользователь с id {request.UserId} не найден");

        var role = request.Role.Trim().ToLowerInvariant();
        if (role is not ("target" or "respondent"))
            return BadRequest("Role должен быть target или respondent");

        await surveyService.AddParticipantAsync(id, request.UserId, role, ct);
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id:int}/participants")]
    public async Task<IActionResult> RemoveParticipant(
        int id, [FromQuery] int userId, [FromQuery] string role, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        if (!SurveyService.IsSurveyDraft(survey!.Status))
            return BadRequest("Удалять участников можно только в черновике опроса");

        var roleNormalized = role.Trim().ToLowerInvariant();
        if (roleNormalized is not ("target" or "respondent"))
            return BadRequest("Role должен быть target или respondent");

        if (!await context.Users.AnyAsync(u => u.Id == userId, ct))
            return NotFound($"Пользователь с id {userId} не найден");

        await surveyService.RemoveParticipantAsync(id, userId, roleNormalized, ct);
        return NoContent();
    }

    [Authorize]
    [HttpPut("{id:int}/assignments")]
    public async Task<IActionResult> SaveAssignments(
        int id, [FromBody] SaveAssignmentsRequest request, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        await surveyService.SaveAssignmentsAsync(id, request.Entries, ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("{id:int}/save-as-template")]
    public async Task<ActionResult<int>> SaveAsTemplate(
        int id, [FromBody] SaveAsTemplateRequest request, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        var templateId = await surveyService.SaveAsTemplateAsync(id, request.Name, request.Description, ct);
        return templateId is null ? BadRequest("Нельзя создать шаблон без вопросов") : templateId;
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        var deleted = await surveyService.DeleteSurveyAsync(id, ct);
        return deleted ? NoContent() : BadRequest("Нельзя удалить активный опрос. Сначала завершите его.");
    }

    [Authorize]
    [HttpPut("{id:int}/questions/order")]
    public async Task<IActionResult> ReorderQuestions(
        int id, [FromBody] ReorderQuestionsRequest request, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        await surveyService.ReorderQuestionsAsync(id, request.OrderedIds, ct);
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id:int}/questions")]
    public async Task<IActionResult> DeleteAllQuestions(int id, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        await surveyService.DeleteAllQuestionsAsync(id, ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("{id:int}/assignments/complete")]
    public async Task<IActionResult> CompleteAssignment(
        int id, [FromBody] CompleteAssignmentRequest request, CancellationToken ct)
    {
        if (request.ReviewerId <= 0 || request.TargetId <= 0)
            return BadRequest("ReviewerId и TargetId обязательны");

        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        if (!User.IsAdmin() && request.ReviewerId != userId.Value) return Forbid();

        var result = await surveyService.CompleteAssignmentAsync(
            id, request.ReviewerId, request.TargetId, userId, User.IsAdmin(), ct);

        if (result is null) return NotFound();
        if (result == -1) return BadRequest("Назначение не найдено в матрице опроса");
        if (result == -2)
            return BadRequest(new { message = "Не заполнены обязательные вопросы" });
        if (result == -3)
            return BadRequest("Опрос не активен");

        await NotifySurveyUpdatedAsync(id, null, ct);
        return NoContent();
    }

    [Authorize]
    [HttpGet("{id:int}/report/info")]
    public async Task<ActionResult<SurveyReportInfoDto>> GetReportInfo(int id, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        var info = await surveyService.GetReportInfoAsync(id, ct);
        return info is null ? NotFound() : info;
    }

    [Authorize]
    [HttpGet("{id:int}/report.docx")]
    public async Task<IActionResult> DownloadReport(int id, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        var result = await surveyService.BuildReportAsync(id, ct);
        if (result is null)
        {
            var exists = await context.Surveys.AnyAsync(s => s.Id == id, ct);
            return exists ? BadRequest("Нет ответов для формирования отчёта") : NotFound();
        }

        const string contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return File(result.Value.Stream, contentType, result.Value.FileName);
    }

    [Authorize]
    [HttpGet("{id:int}/report.csv")]
    public async Task<IActionResult> DownloadCsvReport(int id, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        var result = await surveyService.BuildCsvReportAsync(id, ct);
        if (result is null)
        {
            var exists = await context.Surveys.AnyAsync(s => s.Id == id, ct);
            return exists ? BadRequest("Нет ответов для формирования отчёта") : NotFound();
        }

        var preamble = System.Text.Encoding.UTF8.GetPreamble();
        var body = System.Text.Encoding.UTF8.GetBytes(result.Value.Csv);
        var bytes = new byte[preamble.Length + body.Length];
        Array.Copy(preamble, 0, bytes, 0, preamble.Length);
        Array.Copy(body, 0, bytes, preamble.Length, body.Length);
        return File(bytes, "text/csv; charset=utf-8", result.Value.FileName);
    }

    [Authorize]
    [HttpGet("{id:int}/responses/{reviewerId:int}/{targetId:int}")]
    public async Task<ActionResult<List<ResponseItemDto>>> GetResponses(
        int id, int reviewerId, int targetId, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = await RequireViewSurveyAsync(survey, ct);
        if (accessError is not null) return accessError;

        return await surveyService.GetResponsesAsync(id, reviewerId, targetId, ct);
    }

    [Authorize]
    [HttpGet("{id:int}/links")]
    public async Task<ActionResult<List<RespondentLinkDto>>> GetRespondentLinks(int id, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        return await linkService.GetLinksAsync(id, ct);
    }

    [Authorize]
    [HttpPost("{id:int}/send-invites")]
    public async Task<ActionResult<SendInvitesResult>> SendInvites(
        int id, [FromBody] SendInvitesRequest? request, CancellationToken ct)
    {
        var survey = await surveyService.GetSurveyAsync(id, ct);
        var accessError = RequireManageSurvey(survey);
        if (accessError is not null) return accessError;

        try
        {
            return await surveyService.SendInvitesAsync(id, request?.ReviewerId, ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("invite/{token}")]
    public async Task<ActionResult<InviteInfoDto>> ResolveInvite(string token, CancellationToken ct)
    {
        var info = await linkService.ResolveTokenAsync(token, ct);
        return info is null ? NotFound() : info;
    }
}
