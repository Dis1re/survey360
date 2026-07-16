namespace WebApp.Data;

public class AiSummaryOptions
{
    public const string SectionName = "AiSummary";

    public string OAuthBaseUrl { get; set; } = "https://ngw.devices.sberbank.ru:9443";
    public string ChatBaseUrl { get; set; } = "https://gigachat.devices.sberbank.ru";
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";
    public string Scope { get; set; } = "GIGACHAT_API_PERS";
}
