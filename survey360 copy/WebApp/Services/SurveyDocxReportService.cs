using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using A = DocumentFormat.OpenXml.Drawing;
using DW = DocumentFormat.OpenXml.Drawing.Wordprocessing;
using Microsoft.EntityFrameworkCore;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Services;

public record SurveyReportInfo(int AnswerCount, int AssignedCount, int CompletedCount, bool AllAssignedCompleted);

public class SurveyDocxReportService(ApplicationDbContext context, ILogger<SurveyDocxReportService> logger)
{
    private const string BrandColor = "FF8600";
    private const string TextColor = "1F2937";
    private const string MutedColor = "6B7280";
    private const string AccentBackground = "FFF7ED";
    private const string FontName = "Calibri";
    private const string ParagraphSpacingAfter = "40";
    private uint _drawingId = 1;

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
        var allAssignedCompleted = assignedCount > 0 && assigned.All(a => a.IsCompleted);

        return new SurveyReportInfo(answerCount, assignedCount, completedCount, allAssignedCompleted);
    }

    public async Task<(byte[] Bytes, string FileName)?> BuildReportAsync(int surveyId, CancellationToken ct)
    {
        try
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

            var answersByQuestionReviewerTarget = answers
                .GroupBy(a => (a.QuestionId, a.UserId, a.TargetId))
                .ToDictionary(g => g.Key, g => g.First());

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

                var headerPartId = AddBrandHeader(mainPart);

                foreach (var element in BuildTitleElements(survey))
                    body.Append(element);

                foreach (var targetId in targetIds)
                {
                    var targetName = usersById.GetValueOrDefault(targetId)?.Name ?? $"Пользователь #{targetId}";
                    body.Append(CreateSectionHeading($"Оцениваемый: {targetName}"));

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
                        body.Append(CreateSubsectionHeading($"Респондент: {reviewerName}"));

                        var questionIndex = 1;
                        foreach (var question in questions)
                        {
                            answersByQuestionReviewerTarget.TryGetValue(
                                (question.Id, reviewerId, targetId), out var answer);

                            if (answer is null)
                                continue;

                            body.Append(CreateQuestionParagraph(questionIndex, question.Text));
                            body.Append(CreateAnswerParagraph(answer.Text, question));
                            questionIndex++;
                        }
                    }

                    body.Append(CreateOrangeDivider());
                }

                body.Append(CreateClosingBlock(survey.Name));
                body.Append(CreateSectionProperties(headerPartId));
                mainPart.Document.Save();
            }

            var fileName = $"{SanitizeFileName(survey.Name)}-результаты.docx";
            return (stream.ToArray(), fileName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to build DOCX report for survey {SurveyId}", surveyId);
            throw;
        }
    }

    private string AddBrandHeader(MainDocumentPart mainPart)
    {
        var headerPart = mainPart.AddNewPart<HeaderPart>();
        var header = new Header();
        header.Append(CreateHeaderBanner(headerPart));
        header.Append(CreateOrangeRuleParagraph(compact: true));
        headerPart.Header = header;
        return mainPart.GetIdOfPart(headerPart);
    }

    private Paragraph CreateHeaderBanner(HeaderPart headerPart)
    {
        var paragraph = new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines { After = "0", Line = "240", LineRule = LineSpacingRuleValues.Auto },
                new Justification { Val = JustificationValues.Left }));

        AppendLogoRun(headerPart, paragraph, widthEmu: 450000L, heightEmu: 450000L);
        paragraph.Append(CreateRun("Directum", bold: true, color: BrandColor, sizeHalfPoints: 22));
        paragraph.Append(new Run(new Text(" · ") { Space = SpaceProcessingModeValues.Preserve }));
        paragraph.Append(CreateRun("Опросы 360", color: MutedColor, sizeHalfPoints: 18));
        return paragraph;
    }

    private IEnumerable<OpenXmlElement> BuildTitleElements(Survey survey)
    {
        yield return CreateCenteredParagraph(survey.Name, bold: true, color: BrandColor, sizeHalfPoints: 32);
        yield return CreateCenteredParagraph("Результаты опроса", bold: true, color: TextColor, sizeHalfPoints: 22);

        if (!string.IsNullOrWhiteSpace(survey.Description))
            yield return CreateParagraph(survey.Description.Trim(), color: TextColor, sizeHalfPoints: 20);

        yield return CreateCenteredParagraph(
            $"Дата проведения: {FormatSurveyPeriod(survey)}",
            color: MutedColor,
            sizeHalfPoints: 18);
        yield return CreateOrangeRuleParagraph(compact: true);
    }

    private void AppendLogoRun(OpenXmlPartContainer container, Paragraph paragraph, long widthEmu, long heightEmu)
    {
        var logoBytes = DirectumReportAssets.GetLogoBytes();
        if (logoBytes is null || logoBytes.Length == 0)
            return;

        var relationshipId = AddPngImage(container, logoBytes);
        paragraph.Append(new Run(CreateImageDrawing(relationshipId, widthEmu, heightEmu, NextDrawingId())));
    }

    private static string AddPngImage(OpenXmlPartContainer container, byte[] imageBytes)
    {
        ImagePart imagePart = container switch
        {
            MainDocumentPart mainPart => mainPart.AddImagePart(ImagePartType.Png),
            HeaderPart headerPart => headerPart.AddImagePart(ImagePartType.Png),
            _ => throw new InvalidOperationException("Unsupported container for DOCX images."),
        };

        using var imageStream = new MemoryStream(imageBytes);
        imagePart.FeedData(imageStream);
        return container.GetIdOfPart(imagePart);
    }

    private uint NextDrawingId() => _drawingId++;

    private Drawing CreateImageDrawing(string relationshipId, long widthEmu, long heightEmu, uint drawingId) =>
        new(
            new DW.Inline(
                new DW.Extent { Cx = widthEmu, Cy = heightEmu },
                new DW.EffectExtent
                {
                    LeftEdge = 0L,
                    TopEdge = 0L,
                    RightEdge = 0L,
                    BottomEdge = 0L,
                },
                new DW.DocProperties { Id = drawingId, Name = $"DirectumLogo{drawingId}" },
                new DW.NonVisualGraphicFrameDrawingProperties(new A.GraphicFrameLocks { NoChangeAspect = true }),
                new A.Graphic(
                    new A.GraphicData(
                        new PIC.Picture(
                            new PIC.NonVisualPictureProperties(
                                new PIC.NonVisualDrawingProperties { Id = drawingId, Name = "Survey360Logo.png" },
                                new PIC.NonVisualPictureDrawingProperties()),
                            new PIC.BlipFill(
                                new A.Blip { Embed = relationshipId },
                                new A.Stretch(new A.FillRectangle())),
                            new PIC.ShapeProperties(
                                new A.Transform2D(
                                    new A.Offset { X = 0L, Y = 0L },
                                    new A.Extents { Cx = widthEmu, Cy = heightEmu }),
                                new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle })))
                    { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" }))
            {
                DistanceFromTop = 0U,
                DistanceFromBottom = 0U,
                DistanceFromLeft = 0U,
                DistanceFromRight = 0U,
            });

    private Paragraph CreateSectionHeading(string text) =>
        CreateParagraph(text, bold: true, color: BrandColor, sizeHalfPoints: 24, shading: AccentBackground, after: "60");

    private Paragraph CreateSubsectionHeading(string text) =>
        CreateParagraph(text, bold: true, color: TextColor, sizeHalfPoints: 20, after: "40");

    private Paragraph CreateQuestionParagraph(int index, string text)
    {
        var paragraph = new Paragraph(
            new ParagraphProperties(new SpacingBetweenLines { After = ParagraphSpacingAfter }));

        paragraph.Append(CreateRun($"{index}. ", bold: true, color: MutedColor, sizeHalfPoints: 20));
        paragraph.Append(CreateRun(text, bold: true, color: TextColor, sizeHalfPoints: 20));
        return paragraph;
    }

    private Paragraph CreateAnswerParagraph(string answerText, Question question)
    {
        var paragraph = new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines { After = ParagraphSpacingAfter },
                new Indentation { Left = "360" },
                new Shading
                {
                    Val = ShadingPatternValues.Clear,
                    Color = "auto",
                    Fill = AccentBackground,
                }));

        paragraph.Append(CreateRun("Ответ: ", color: MutedColor, sizeHalfPoints: 20));
        foreach (var run in SurveyAnswerFormatter.FormatRuns(question, answerText))
            paragraph.Append(CreateRun(run.Text, bold: run.Bold, color: TextColor, sizeHalfPoints: 20));

        return paragraph;
    }

    private Paragraph CreateClosingBlock(string surveyName)
    {
        var generatedAt = DateTime.Now.ToString("dd.MM.yyyy HH:mm");
        var paragraph = new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines { Before = "120", After = "0" },
                new Justification { Val = JustificationValues.Center }));

        paragraph.Append(CreateRun("Directum · Опросы 360", color: BrandColor, sizeHalfPoints: 18));
        paragraph.Append(new Run(new Break()));
        paragraph.Append(CreateRun($"{surveyName} · сформировано {generatedAt}", color: MutedColor, sizeHalfPoints: 16));
        return paragraph;
    }

    private static Paragraph CreateOrangeRuleParagraph(bool compact = false) =>
        new(
            new ParagraphProperties(
                new ParagraphBorders(
                    new BottomBorder
                    {
                        Val = BorderValues.Single,
                        Size = 8,
                        Color = BrandColor,
                        Space = 1,
                    }),
                new SpacingBetweenLines
                {
                    After = compact ? "60" : "80",
                    Before = compact ? "40" : "60",
                }));

    private static Paragraph CreateOrangeDivider() =>
        new(
            new ParagraphProperties(
                new ParagraphBorders(
                    new BottomBorder
                    {
                        Val = BorderValues.Single,
                        Size = 6,
                        Color = BrandColor,
                        Space = 1,
                    }),
                new SpacingBetweenLines { After = "60", Before = "60" }));

    private static SectionProperties CreateSectionProperties(string headerPartId) =>
        new(
            new HeaderReference { Type = HeaderFooterValues.Default, Id = headerPartId },
            new PageMargin
            {
                Top = 900,
                Right = 900,
                Bottom = 900,
                Left = 900,
                Header = 480,
            });

    private static string FormatSurveyPeriod(Survey survey)
    {
        var hasStart = survey.StartedAt != default;
        var hasEnd = survey.ClosedAt != default;

        if (hasStart && hasEnd)
            return $"{survey.StartedAt:dd.MM.yyyy} — {survey.ClosedAt:dd.MM.yyyy}";

        if (hasStart)
            return $"с {survey.StartedAt:dd.MM.yyyy}";

        return survey.CreatedAt != default
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

    private static Paragraph CreateCenteredParagraph(
        string text,
        bool bold = false,
        string? color = null,
        int sizeHalfPoints = 20)
    {
        var paragraph = new Paragraph(
            new ParagraphProperties(
                new Justification { Val = JustificationValues.Center },
                new SpacingBetweenLines { After = ParagraphSpacingAfter }));
        paragraph.Append(CreateRun(text, bold, color, sizeHalfPoints));
        return paragraph;
    }

    private static Paragraph CreateParagraph(
        string text,
        bool bold = false,
        string? color = null,
        int sizeHalfPoints = 20,
        string? shading = null,
        string after = ParagraphSpacingAfter)
    {
        var properties = new ParagraphProperties(new SpacingBetweenLines { After = after });
        if (shading is not null)
        {
            properties.Append(new Shading
            {
                Val = ShadingPatternValues.Clear,
                Color = "auto",
                Fill = shading,
            });
        }

        var paragraph = new Paragraph(properties);
        paragraph.Append(CreateRun(text, bold, color, sizeHalfPoints));
        return paragraph;
    }

    private static Run CreateRun(
        string text,
        bool bold = false,
        string? color = null,
        int sizeHalfPoints = 20)
    {
        var runProperties = new RunProperties(
            new RunFonts { Ascii = FontName, HighAnsi = FontName, ComplexScript = FontName },
            new FontSize { Val = sizeHalfPoints.ToString() },
            new FontSizeComplexScript { Val = sizeHalfPoints.ToString() });

        if (bold)
            runProperties.Append(new Bold());

        if (!string.IsNullOrEmpty(color))
            runProperties.Append(new Color { Val = color });

        return new Run(runProperties, new Text(text) { Space = SpaceProcessingModeValues.Preserve });
    }
}
