using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public class SurveyCsvReportService(ApplicationDbContext context)
{
    public async Task<(string Csv, string FileName)?> BuildCsvAsync(int surveyId, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == surveyId, ct);
        if (survey is null)
            return null;

        var questions = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == surveyId)
            .OrderBy(q => q.Order)
            .ThenBy(q => q.Id)
            .ToListAsync(ct);

        if (questions.Count == 0)
            return null;

        var questionIds = questions.Select(q => q.Id).ToList();
        var answers = await context.Answers
            .AsNoTracking()
            .Where(a => questionIds.Contains(a.QuestionId))
            .ToListAsync(ct);

        if (answers.Count == 0)
            return null;

        var assignments = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.SurveyId == surveyId && a.IsAssigned)
            .ToListAsync(ct);

        var userIds = answers
            .SelectMany(a => new[] { a.UserId, a.TargetId })
            .Union(assignments.SelectMany(a => new[] { a.ReviewerId, a.TargetId }))
            .Distinct()
            .ToList();

        var users = userIds.Count == 0
            ? []
            : await context.Users.AsNoTracking().Where(u => userIds.Contains(u.Id)).ToListAsync(ct);

        var usersById = users.ToDictionary(u => u.Id);
        var assignedPairs = assignments.Select(a => (a.ReviewerId, a.TargetId)).ToHashSet();

        var targetIds = answers
            .Select(a => a.TargetId)
            .Distinct()
            .OrderBy(id => usersById.GetValueOrDefault(id)?.Name ?? id.ToString())
            .ToList();

        var lines = new List<string>
        {
            $"{Escape("Оцениваемый")};{Escape("Респондент")};{Escape("Вопрос")};{Escape("Ответ")}",
        };

        foreach (var targetId in targetIds)
        {
            var targetName = usersById.GetValueOrDefault(targetId)?.Name ?? $"Пользователь #{targetId}";

            var reviewerIds = answers
                .Where(a => a.TargetId == targetId)
                .Select(a => a.UserId)
                .Distinct()
                .Where(reviewerId =>
                    assignedPairs.Count == 0 ||
                    assignedPairs.Contains((reviewerId, targetId)))
                .OrderBy(reviewerId => usersById.GetValueOrDefault(reviewerId)?.Name ?? reviewerId.ToString())
                .ToList();

            foreach (var reviewerId in reviewerIds)
            {
                var reviewerName = usersById.GetValueOrDefault(reviewerId)?.Name ?? $"Пользователь #{reviewerId}";

                foreach (var question in questions)
                {
                    var answer = answers.FirstOrDefault(
                        a => a.QuestionId == question.Id &&
                             a.UserId == reviewerId &&
                             a.TargetId == targetId);
                    var answerText = answer?.Text ?? "";

                    lines.Add($"{Escape(targetName)};{Escape(reviewerName)};{Escape(question.Text)};{Escape(answerText)}");
                }
            }
        }

        var csv = string.Join("\r\n", lines);
        var fileName = $"{SanitizeFileName(survey.Name)}-результаты.csv";
        return (csv, fileName);
    }

    private static string Escape(string value)
    {
        if (string.IsNullOrEmpty(value))
            return "";

        if (value.Contains('"') || value.Contains(';') || value.Contains('\n') || value.Contains('\r'))
            return "\"" + value.Replace("\"", "\"\"") + "\"";

        return value;
    }

    private static string SanitizeFileName(string name)
    {
        var trimmed = name.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return "опрос";

        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = new string(trimmed.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray());
        return string.IsNullOrWhiteSpace(sanitized) ? "опрос" : sanitized;
    }
}
