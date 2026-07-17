namespace WebApp.Data;

public class AiSummaryOptions
{
    public const string SectionName = "AiSummary";

    public bool Enabled { get; set; } = true;
    public string ChatBaseUrl { get; set; } = "";
    public string ChatEndpoint { get; set; } = "/chat/completions";
    public string Model { get; set; } = "";
    public string AuthType { get; set; } = "none";
    public string ApiKey { get; set; } = "";

    public string OAuthBaseUrl { get; set; } = "";
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";
    public string Scope { get; set; } = "GIGACHAT_API_PERS";
}
