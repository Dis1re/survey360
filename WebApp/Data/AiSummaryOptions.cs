namespace WebApp.Data;

public class AiSummaryOptions
{
    public const string SectionName = "AiSummary";

    public string BaseUrl { get; set; } = "https://api.groq.com/openai/v1";
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "llama-3.3-70b-versatile";
}
