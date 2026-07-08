namespace WebApp.Models;

public class SurveyAssignments
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public int ReviewerId { get; set; }
    public int TargetId { get; set; }
    public bool IsAssigned { get; set; }
    public bool IsCompleted { get; set; }
}
