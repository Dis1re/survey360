namespace WebApp.Models;

public class SurveyRespondentLink
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public int ReviewerId { get; set; }
    public string Token { get; set; } = "";
    public DateTime CreatedAt { get; set; }

    public Survey? Survey { get; set; }
    public User? Reviewer { get; set; }
}
