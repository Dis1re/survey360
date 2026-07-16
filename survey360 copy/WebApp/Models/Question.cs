namespace WebApp.Models;

public class Question
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public string Text { get; set; } = "";
    public string Type { get; set; } = "";
    public bool IsRequired { get; set; }
    public string? Props { get; set; }
    public int Order { get; set; }

    public Survey? Survey { get; set; }
    public List<Answer> Answers { get; set; } = [];
}
