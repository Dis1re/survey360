using System.Text.Json.Serialization;

namespace WebApp.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsAdmin { get; set; }

    [JsonIgnore]
    public string PasswordHash { get; set; } = "";

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<Survey> CreatedSurveys { get; set; } = [];
    public List<Answer> Answers { get; set; } = [];
    public List<Answer> TargetAnswers { get; set; } = [];
    public List<SurveyAssignment> ReviewerAssignments { get; set; } = [];
    public List<SurveyAssignment> TargetAssignments { get; set; } = [];
    public List<SurveyParticipant> Participations { get; set; } = [];
}
