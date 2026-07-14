namespace WebApp.Models;

public class Survey
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime ClosedAt { get; set; }
    public int? CreatedByUserId { get; set; }

    public User? CreatedByUser { get; set; }
    public List<Question> Questions { get; set; } = [];
    public List<SurveyAssignment> Assignments { get; set; } = [];
    public List<SurveyParticipant> Participants { get; set; } = [];
}
