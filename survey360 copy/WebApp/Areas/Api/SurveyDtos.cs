using WebApp.Models;

namespace WebApp.Areas.Api;

public record SurveyDetailsDto(
    Survey Survey,
    List<Question> Questions,
    List<Answer> Answers,
    List<SurveyAssignment> Assignments
);

public record UpdateSurveyRequest(
    string Name,
    string Description,
    string Status,
    DateTime? StartedAt,
    DateTime? ClosedAt
);

public record SurveyMatrixDto(
    List<User> Targets,
    List<User> Respondents,
    List<SurveyAssignment> Assignments
);

public record AddSurveyParticipantRequest(int UserId, string Role);

public record SaveAssignmentsRequest(List<AssignmentEntry> Entries);

public record AssignmentEntry(int ReviewerId, int TargetId, bool IsAssigned);

public record SurveyListItemDto(
    int Id,
    string Name,
    string Description,
    string Status,
    DateTime CreatedAt,
    DateTime StartedAt,
    DateTime ClosedAt,
    int? CreatedByUserId,
    int? MyAssignedCount,
    int? MyCompletedCount
);

public record CompleteAssignmentRequest(int ReviewerId, int TargetId);

public record SaveAsTemplateRequest(string Name, string Description);

public record SendInvitesRequest(int? ReviewerId);

public record SurveyReportInfoDto(int AnswerCount, int AssignedCount, int CompletedCount, bool AllAssignedCompleted);

public record ReorderQuestionsRequest(List<int> OrderedIds);

public record ResponseItemDto(string QuestionText, string AnswerText);
