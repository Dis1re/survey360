namespace WebApp.Models;

public class SurveyAssignment
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public int ReviewerId { get; set; }
    public int TargetId { get; set; }
    public bool IsAssigned { get; set; }
    public bool IsCompleted { get; set; }

    public Survey? Survey { get; set; }
    public User? Reviewer { get; set; }
    public User? Target { get; set; }
}
