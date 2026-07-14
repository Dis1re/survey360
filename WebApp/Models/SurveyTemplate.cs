namespace WebApp.Models;

public class SurveyTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Props { get; set; } = "";
    public DateTime CreatedAt { get; set; }

    public List<QuestionTemplate> QuestionTemplates { get; set; } = [];
}
