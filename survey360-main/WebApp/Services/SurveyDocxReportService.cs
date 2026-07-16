using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public record SurveyReportInfo(int AnswerCount, int AssignedCount, int CompletedCount, bool AllAssignedCompleted);

public class SurveyDocxReportService(ApplicationDbContext context)
{
    public async Task<SurveyReportInfo?> GetReportInfoAsync(int surveyId, CancellationToken ct)
    {
        if (!await context.Surveys.AnyAsync(s => s.Id == surveyId, ct))
            return null;

        var questionIds = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == surveyId)
            .Select(q => q.Id)
            .ToListAsync(ct);

        var answerCount = questionIds.Count == 0
            ? 0
            : await context.Answers.AsNoTracking().CountAsync(a => questionIds.Contains(a.QuestionId), ct);

        var assigned = await context.SurveyAssignments
            .AsNoTracking()
            .Where(a => a.SurveyId == surveyId && a.IsAssigned)
            .ToListAsync(ct);

        var assignedCount = assigned.Count;
        var completedCount = assigned.Count(a => a.IsCompleted);
        var allAssignedCompleted = assignedCount == 0 || assigned.All(a => a.IsCompleted);

        return new SurveyReportInfo(answerCount, assignedCount, completedCount, allAssignedCompleted);
    }

    public async Task<(MemoryStream Stream, string FileName)?> BuildReportAsync(int surveyId, CancellationToken ct)
    {
        var survey = await context.Surveys.AsNoTracking().FirstOrDefaultAsync(s => s.Id == surveyId, ct);
        if (survey is null)
            return null;

        var questions = await context.Questions
            .AsNoTracking()
            .Where(q => q.SurveyId == surveyId)
            .OrderBy(q => q.Id)
            .ToListAsync(ct);

        var questionIds = questions.Select(q => q.Id).ToList();
        if (questionIds.Count == 0)
            return null;

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

        var assignedPairs = assignments
            .Select(a => (a.ReviewerId, a.TargetId))
            .ToHashSet();

        var targetIds = answers
            .Select(a => a.TargetId)
            .Distinct()
            .OrderBy(id => usersById.GetValueOrDefault(id)?.Name ?? id.ToString())
            .ToList();

        var stream = new MemoryStream();
        using (var document = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document, true))
        {
            var mainPart = document.AddMainDocumentPart();
            mainPart.Document = new Document(new Body());
            var body = mainPart.Document.Body!;

            body.Append(CreateParagraph(survey.Name, bold: true, sizeHalfPoints: 32));
            body.Append(CreateParagraph(survey.Description));
            body.Append(CreateParagraph($"Дата проведения: {FormatSurveyPeriod(survey)}"));
            body.Append(CreateParagraph(""));

            foreach (var targetId in targetIds)
            {
                var targetName = usersById.GetValueOrDefault(targetId)?.Name ?? $"Пользователь #{targetId}";
                body.Append(CreateParagraph($"Оцениваемый: {targetName}", bold: true, sizeHalfPoints: 26));
                body.Append(CreateParagraph(""));

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
                    body.Append(CreateParagraph($"Респондент: {reviewerName}", bold: true));

                    var questionIndex = 1;
                    foreach (var question in questions)
                    {
                        var answer = answers.FirstOrDefault(
                            a => a.QuestionId == question.Id &&
                                 a.UserId == reviewerId &&
                                 a.TargetId == targetId);

                        if (answer is null)
                            continue;

                        body.Append(CreateParagraph($"{questionIndex}. {question.Text}"));
                        body.Append(CreateParagraph($"Ответ: {answer.Text}"));
                        questionIndex++;
                    }

                    body.Append(CreateParagraph(""));
                }

                body.Append(CreateParagraph("────────────────────────────────────────"));
                body.Append(CreateParagraph(""));
            }

            mainPart.Document.Save();
        }

        stream.Position = 0;
        var fileName = $"{SanitizeFileName(survey.Name)}-результаты.docx";
        return (stream, fileName);
    }

    private static string FormatSurveyPeriod(Survey survey)
    {
        var hasStart = survey.StartedAt.Year > 1;
        var hasEnd = survey.ClosedAt.Year > 1;

        if (hasStart && hasEnd)
            return $"{survey.StartedAt:dd.MM.yyyy} — {survey.ClosedAt:dd.MM.yyyy}";

        if (hasStart)
            return $"с {survey.StartedAt:dd.MM.yyyy}";

        return survey.CreatedAt.Year > 1
            ? survey.CreatedAt.ToString("dd.MM.yyyy")
            : "—";
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

    private static Paragraph CreateParagraph(string text, bool bold = false, int sizeHalfPoints = 22)
    {
        var runProperties = new RunProperties(new FontSize { Val = sizeHalfPoints.ToString() });
        if (bold)
            runProperties.Append(new Bold());

        var run = new Run(runProperties, new Text(text) { Space = SpaceProcessingModeValues.Preserve });
        return new Paragraph(run);
    }
}
