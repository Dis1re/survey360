namespace WebApp.Models;

public class SurveyParticipant
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public int UserId { get; set; }
    public bool IsTarget { get; set; }
    public bool IsRespondent { get; set; }
    public string? Token { get; set; }
    public DateTime CreatedAt { get; set; }

    public Survey? Survey { get; set; }
    public User? User { get; set; }
}
