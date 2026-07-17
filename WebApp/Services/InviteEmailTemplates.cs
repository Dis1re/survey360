using System.Net;
using System.Text;
using WebApp.Models;

namespace WebApp.Services;

internal static class InviteEmailTemplates
{
    private const string BrandOrange = "#FF8600";

    public static string BuildSubject(Survey survey) =>
        $"Вас ждёт опрос 360° — «{survey.Name}»";

    public static string BuildTextBody(
        string reviewerName,
        Survey survey,
        IReadOnlyList<string> targetNames,
        string inviteUrl)
    {
        var greeting = BuildGreeting(reviewerName);
        var about = BuildAboutText(targetNames);
        var descriptionBlock = string.IsNullOrWhiteSpace(survey.Description)
            ? ""
            : $"\n\nОписание:\n{survey.Description.Trim()}";

        return
            "Опросы 360 · Директум\n\n" +
            "Посмотрите на коллег со всех сторон — буквально. Это опрос 360°.\n\n" +
            $"{greeting}\n\n" +
            $"Опрос: «{survey.Name}»\n\n" +
            $"{about}{descriptionBlock}\n\n" +
            "Откройте приложение и войдите под своим аккаунтом:\n" +
            $"{inviteUrl}\n\n" +
            "После входа опрос будет доступен во вкладке «Участие».\n\n" +
            "—\n" +
            "Не пересылайте письмо — ссылка предназначена для вас.";
    }

    public static string BuildHtmlBody(
        string reviewerName,
        Survey survey,
        IReadOnlyList<string> targetNames,
        string inviteUrl,
        string baseUrl)
    {
        var greeting = Encode(BuildGreeting(reviewerName));
        var surveyName = Encode(survey.Name);
        var aboutHtml = BuildAboutHtml(targetNames);
        var descriptionHtml = BuildDescriptionHtml(survey.Description);
        var inviteUrlEncoded = Encode(inviteUrl);
        var logoUrl = Encode($"{baseUrl.TrimEnd('/')}/Survey360Logo.webp");

        return $"""
            <!DOCTYPE html>
            <html lang="ru">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>{surveyName}</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
                <tr>
                  <td align="center" style="padding:32px 16px;">
                    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(17,24,39,0.08);">
                      <tr>
                        <td style="height:4px;background-color:{BrandOrange};font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td style="padding:28px 32px 8px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="72" valign="middle" style="padding-right:16px;">
                                <img src="{logoUrl}" alt="Опросы 360" width="64" height="64" style="display:block;width:64px;height:64px;border:0;object-fit:contain;">
                              </td>
                              <td valign="middle">
                                <div style="font-size:22px;font-weight:700;line-height:1.2;color:#111827;">Опросы 360</div>
                                <div style="font-size:13px;line-height:1.4;color:#6b7280;margin-top:4px;">Директум</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 32px 0;">
                          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">
                            Посмотрите на коллег со всех сторон — буквально. Это опрос 360°.
                          </p>
                          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#111827;">
                            {greeting}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 32px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid {BrandOrange};border-radius:12px;background-color:#fffaf5;">
                            <tr>
                              <td style="padding:20px 22px;">
                                <div style="font-size:18px;font-weight:700;line-height:1.4;color:#111827;margin-bottom:14px;">
                                  «{surveyName}»
                                </div>
                                {aboutHtml}
                                {descriptionHtml}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0 32px 12px;">
                          <a href="{inviteUrlEncoded}" style="display:inline-block;background-color:{BrandOrange};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;line-height:1.2;">
                            Пройти опрос →
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 32px 28px;">
                          <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
                            Если кнопка не открывается, перейдите по ссылке и войдите в приложение:<br>
                            <a href="{inviteUrlEncoded}" style="color:{BrandOrange};word-break:break-all;">{inviteUrlEncoded}</a>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
                          <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
                            Опросы 360 · Директум
                          </p>
                          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
                            Не пересылайте письмо — ссылка предназначена для вас.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }

    private static string BuildGreeting(string reviewerName) =>
        string.IsNullOrWhiteSpace(reviewerName)
            ? "Здравствуйте!"
            : $"Здравствуйте, {reviewerName}!";

    private static string BuildAboutText(IReadOnlyList<string> targetNames) =>
        targetNames.Count switch
        {
            0 => "О ком: объекты оценки не назначены.",
            1 => $"О ком: {targetNames[0]}.",
            _ => $"О ком: {string.Join(", ", targetNames)}.",
        };

    private static string BuildAboutHtml(IReadOnlyList<string> targetNames)
    {
        if (targetNames.Count == 0)
        {
            return """
                <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                  <span style="font-weight:600;color:#374151;">О ком:</span> объекты оценки не назначены.
                </p>
                """;
        }

        var pills = new StringBuilder();
        foreach (var name in targetNames)
        {
            pills.Append(
                $"""<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;background-color:#ffffff;border:1px solid #fed7aa;border-radius:999px;font-size:13px;line-height:1.4;color:#374151;">{Encode(name)}</span>""");
        }

        return $"""
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4b5563;">
              <span style="font-weight:600;color:#374151;">О ком:</span>
            </p>
            <div style="margin:0 0 4px;line-height:1.6;">
              {pills}
            </div>
            """;
    }

    private static string BuildDescriptionHtml(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return "";

        var encoded = Encode(description.Trim()).Replace("\n", "<br>", StringComparison.Ordinal);
        return $"""
            <div style="margin-top:14px;padding-top:14px;border-top:1px solid #fde68a;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:600;line-height:1.5;color:#374151;">Описание</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">{encoded}</p>
            </div>
            """;
    }

    private static string Encode(string value) => WebUtility.HtmlEncode(value);
}
