namespace WebApp.Models;

public class QuestionTemplate
{
    public int Id { get; set; }
    public int SurveyTemplateId { get; set; }
    public string Text { get; set; } = "";
    public string Type { get; set; } = "";
    public bool IsRequired { get; set; }
    public string? Props { get; set; }
}
