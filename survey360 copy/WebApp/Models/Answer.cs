namespace WebApp.Models;

public class Answer
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public int UserId { get; set; }
    public int TargetId { get; set; }
    public string Text { get; set; } = "";

    public Question? Question { get; set; }
    public User? User { get; set; }
    public User? TargetUser { get; set; }
}
