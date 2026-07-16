namespace WebApp.Services;

public record InviteAccess(int SurveyId, int ReviewerId);

public class InviteAccessService(SurveyRespondentLinkService linkService)
{
    public const string InviteTokenHeader = "X-Invite-Token";

    public async Task<InviteAccess?> ResolveFromRequestAsync(HttpRequest request, CancellationToken ct)
    {
        if (!request.Headers.TryGetValue(InviteTokenHeader, out var values))
            return null;

        var token = values.FirstOrDefault()?.Trim();
        if (string.IsNullOrEmpty(token))
            return null;

        var info = await linkService.ResolveTokenAsync(token, ct);
        return info is null ? null : new InviteAccess(info.SurveyId, info.ReviewerId);
    }
}
