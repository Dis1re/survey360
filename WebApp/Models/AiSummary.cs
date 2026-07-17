namespace WebApp.Models;

public class AiSummary
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public string SummaryType { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
