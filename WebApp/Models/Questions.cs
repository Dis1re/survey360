namespace WebApp.Models;

public class Questions
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public string Text { get; set; } = "";
    public string Type { get; set; } = "";
}
