namespace WebApp.Models;

public class QuestionProps
{
    public int? Min { get; set; }
    public int? Max { get; set; }
    public int? Step { get; set; }
    public List<string>? Options { get; set; }
    public string? Placeholder { get; set; }
}
