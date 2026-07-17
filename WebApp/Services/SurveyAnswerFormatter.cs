using System.Text.Json;
using WebApp.Models;

namespace WebApp.Services;

public readonly record struct FormattedTextRun(string Text, bool Bold);

public static class SurveyAnswerFormatter
{
    public record QuestionOption(int Value, string Label);

    public record ScaleConfig(int Min, int Max, int Step)
    {
        public List<int> GetValues()
        {
            var baseStep = Math.Max(1, Math.Abs(Step));
            var step = Min > Max ? -baseStep : baseStep;
            var values = new List<int>();

            if (step > 0)
            {
                for (var value = Min; value <= Max; value += step)
                    values.Add(value);
            }
            else if (step < 0)
            {
                for (var value = Min; value >= Max; value += step)
                    values.Add(value);
            }

            if (values.Count == 0)
            {
                for (var value = 1; value <= 5; value++)
                    values.Add(value);
            }

            return values;
        }
    }

    public static string FormatPlain(Question question, string answerText) =>
        string.Concat(FormatRuns(question, answerText).Select(run => run.Text));

    public static string FormatSelectedPlain(Question question, string answerText)
    {
        var trimmed = answerText?.Trim() ?? "";
        if (string.IsNullOrEmpty(trimmed))
            return "— нет ответа —";

        var type = NormalizeType(question.Type);
        if (type is "text")
            return trimmed;

        if (type is "date")
            return FormatDateValue(trimmed);

        if (type is "scale")
        {
            var selected = ParseSelectedValues(trimmed);
            var config = ParseScaleConfig(question.Props);
            var values = config.GetValues();
            var chosen = values.FirstOrDefault(v => IsScaleValueSelected(v, selected), values.Count > 0 ? values[0] : 0);
            return chosen.ToString();
        }

        var options = ParseRadioOptions(question.Props);
        if (options.Count == 0)
            return trimmed;

        var selectedOptions = ParseSelectedValues(trimmed);
        var labels = options
            .Where(option => IsOptionSelected(option, selectedOptions))
            .Select(option => option.Label)
            .ToList();

        if (labels.Count == 0)
            return trimmed;

        var separator = type is "checkbox" ? "; " : ", ";
        return string.Join(separator, labels);
    }

    private static string FormatDateValue(string answerText)
    {
        var trimmed = answerText?.Trim() ?? "";
        if (string.IsNullOrEmpty(trimmed))
            return trimmed;

        var raw = trimmed.Length >= 10 ? trimmed[..10] : trimmed;
        if (DateTime.TryParse(raw, out var date) && date.Year > 1)
            return date.ToString("dd.MM.yyyy");

        return trimmed;
    }

    public static IReadOnlyList<FormattedTextRun> FormatRuns(Question question, string answerText)
    {
        var trimmed = answerText?.Trim() ?? "";
        if (string.IsNullOrEmpty(trimmed))
            return [new FormattedTextRun("—", false)];

        var type = NormalizeType(question.Type);
        if (type is "text")
            return [new FormattedTextRun(trimmed, true)];

        if (type is "date")
            return [new FormattedTextRun(FormatDateValue(trimmed), false)];

        if (type is "scale")
            return FormatScaleRuns(question.Props, trimmed);

        if (type is "checkbox")
        {
            var checkboxOptions = ParseRadioOptions(question.Props);
            if (checkboxOptions.Count == 0)
                return [new FormattedTextRun(trimmed, true)];

            return FormatCheckboxRuns(checkboxOptions, trimmed);
        }

        var options = ParseRadioOptions(question.Props);
        if (options.Count == 0)
            return [new FormattedTextRun(trimmed, true)];

        return FormatChoiceRuns(options, trimmed);
    }

    private static List<FormattedTextRun> FormatScaleRuns(string? propsJson, string answerText)
    {
        var config = ParseScaleConfig(propsJson);
        var values = config.GetValues();
        var selected = ParseSelectedValues(answerText);
        var chosen = values.FirstOrDefault(v => IsScaleValueSelected(v, selected), values.Count > 0 ? values[0] : 0);

        return [new FormattedTextRun(chosen.ToString(), true)];
    }

    private static List<FormattedTextRun> FormatChoiceRuns(List<QuestionOption> options, string answerText)
    {
        var selected = ParseSelectedValues(answerText);
        var chosen = options.FirstOrDefault(option => IsOptionSelected(option, selected));

        return [new FormattedTextRun(chosen?.Label ?? answerText, false)];
    }

    private static List<FormattedTextRun> FormatCheckboxRuns(List<QuestionOption> options, string answerText)
    {
        var selected = ParseSelectedValues(answerText);
        var chosenLabels = options
            .Where(option => IsOptionSelected(option, selected))
            .Select(option => option.Label)
            .ToList();

        if (chosenLabels.Count == 0)
            return [new FormattedTextRun(answerText, true)];

        var runs = new List<FormattedTextRun>();
        for (var i = 0; i < chosenLabels.Count; i++)
        {
            if (i > 0)
                runs.Add(new FormattedTextRun("; ", false));

            runs.Add(new FormattedTextRun(chosenLabels[i], false));
        }

        return runs;
    }

    private static bool IsScaleValueSelected(int value, HashSet<string> selected) =>
        selected.Contains(value.ToString()) ||
        selected.Any(item => int.TryParse(item, out var parsed) && parsed == value);

    private static bool IsOptionSelected(QuestionOption option, HashSet<string> selected) =>
        selected.Contains(option.Value.ToString()) ||
        selected.Contains(option.Label, StringComparer.OrdinalIgnoreCase);

    private static ScaleConfig ParseScaleConfig(string? propsJson)
    {
        var min = 1;
        var max = 5;
        var step = 1;

        if (!string.IsNullOrWhiteSpace(propsJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(propsJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Object)
                {
                    if (doc.RootElement.TryGetProperty("min", out var minElement))
                        min = ReadIntProperty(minElement, min);
                    if (doc.RootElement.TryGetProperty("max", out var maxElement))
                        max = ReadIntProperty(maxElement, max);
                    if (doc.RootElement.TryGetProperty("step", out var stepElement))
                        step = Math.Max(1, Math.Abs(ReadIntProperty(stepElement, step)));
                }
            }
            catch
            {
                // keep defaults
            }
        }

        return new ScaleConfig(min, max, step);
    }

    private static int ReadIntProperty(JsonElement element, int fallback)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Number when element.TryGetInt32(out var number) => number,
            JsonValueKind.String when int.TryParse(element.GetString(), out var parsed) => parsed,
            _ => fallback,
        };
    }

    private static string NormalizeType(string type)
    {
        var normalized = type.Trim().ToLowerInvariant();
        return normalized switch
        {
            "single" => "radio",
            "rating" => "scale",
            "checkbox" or "checkboxes" or "multiple" or "multi" => "checkbox",
            _ => normalized,
        };
    }

    public static List<QuestionOption> ParseRadioOptions(string? propsJson)
    {
        if (string.IsNullOrWhiteSpace(propsJson))
            return [];

        try
        {
            using var doc = JsonDocument.Parse(propsJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return [];

            var options = new List<QuestionOption>();
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                if (!int.TryParse(prop.Name, out var value))
                    continue;

                var label = prop.Value.ValueKind switch
                {
                    JsonValueKind.String => prop.Value.GetString() ?? "",
                    JsonValueKind.Number => prop.Value.GetRawText(),
                    _ => prop.Value.ToString(),
                };
                options.Add(new QuestionOption(value, label.Trim()));
            }

            return options.OrderBy(option => option.Value).ToList();
        }
        catch
        {
            return [];
        }
    }

    private static HashSet<string> ParseSelectedValues(string answerText)
    {
        var parts = answerText.Split([',', ';', '|'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length <= 1)
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase) { answerText.Trim() };

        return parts.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }
}
