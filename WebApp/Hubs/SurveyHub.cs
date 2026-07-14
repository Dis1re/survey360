using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace WebApp.Hubs;

[Authorize]
public class SurveyHub : Hub
{
}

public static class SurveyLiveEvents
{
    public const string SurveyUpdated = "SurveyUpdated";
}

public record SurveyUpdatedPayload(int SurveyId, string Status);
