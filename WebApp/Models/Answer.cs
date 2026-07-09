namespace WebApp.Models;

public class Answer
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public int UserId { get; set; }
    public string Text { get; set; } = "";
    public string Type { get; set; } = "";
}
