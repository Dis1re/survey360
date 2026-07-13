using System.Text.Json.Nodes;

namespace WebApp.Models;

public class Question
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public string Text { get; set; } = "";
    public string Type { get; set; } = "";
    public bool IsRequired { get; set; }
    public JsonObject? Props { get; set; }
}
