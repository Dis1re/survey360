using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public class SurveyXlsxReportService(ApplicationDbContext context)
{
    public async Task<(byte[] Bytes, string FileName)?> BuildXlsxAsync(int surveyId, CancellationToken ct)
    {
        return await BuildXlsxAsync(surveyId, ct, null, null);
    }

    public async Task<(byte[] Bytes, string FileName)?> BuildXlsxAsync(
        int surveyId,
        CancellationToken ct,
        int? filterReviewerId = null,
        int? filterTargetId = null)
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
        var answersQuery = context.Answers
            .AsNoTracking()
            .Where(a => questionIds.Contains(a.QuestionId));

        if (filterReviewerId.HasValue)
            answersQuery = answersQuery.Where(a => a.UserId == filterReviewerId.Value);
        if (filterTargetId.HasValue)
            answersQuery = answersQuery.Where(a => a.TargetId == filterTargetId.Value);

        var answers = await answersQuery.ToListAsync(ct);

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

        var rows = new List<(string Target, string Reviewer, string Question, string Answer)>();

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
                    var answerText = answer is null
                        ? ""
                        : SurveyAnswerFormatter.FormatSelectedPlain(question, answer.Text);

                    rows.Add((targetName, reviewerName, question.Text, answerText));
                }
            }
        }

        var bytes = BuildWorkbook(rows);
        var fileName = $"{SanitizeFileName(survey.Name)}-результаты.xlsx";
        return (bytes, fileName);
    }

    private static byte[] BuildWorkbook(List<(string Target, string Reviewer, string Question, string Answer)> rows)
    {
        using var stream = new MemoryStream();
        using (var document = SpreadsheetDocument.Create(stream, SpreadsheetDocumentType.Workbook))
        {
            var workbookPart = document.AddWorkbookPart();
            workbookPart.Workbook = new Workbook();

            var worksheetPart = workbookPart.AddNewPart<WorksheetPart>();

            var columns = new Columns(
                new Column { Min = 1, Max = 1, Width = 22, CustomWidth = true },
                new Column { Min = 2, Max = 2, Width = 22, CustomWidth = true },
                new Column { Min = 3, Max = 3, Width = 40, CustomWidth = true },
                new Column { Min = 4, Max = 4, Width = 50, CustomWidth = true });

            var sheetData = new SheetData();

            var headerRow = new Row();
            headerRow.Append(
                AppendCell("Оцениваемый"),
                AppendCell("Респондент"),
                AppendCell("Вопрос"),
                AppendCell("Ответ"));
            sheetData.Append(headerRow);

            foreach (var row in rows)
            {
                var dataRow = new Row();
                dataRow.Append(
                    AppendCell(row.Target),
                    AppendCell(row.Reviewer),
                    AppendCell(row.Question),
                    AppendCell(row.Answer));
                sheetData.Append(dataRow);
            }

            worksheetPart.Worksheet = new Worksheet(columns, sheetData);

            var sheets = workbookPart.Workbook.AppendChild(new Sheets());
            sheets.Append(new Sheet
            {
                Id = workbookPart.GetIdOfPart(worksheetPart),
                SheetId = 1,
                Name = "Результаты",
            });

            workbookPart.Workbook.Save();
        }

        return stream.ToArray();
    }

    private static Cell AppendCell(string value)
    {
        return new Cell
        {
            DataType = CellValues.String,
            CellValue = new CellValue(value ?? ""),
        };
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
