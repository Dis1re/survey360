namespace WebApp.Data;

public class EmailSettings
{
    public const string SectionName = "Email";

    /// <summary>Mailtrap API token (Settings → API Tokens). Preferred over SMTP.</summary>
    public string ApiToken { get; set; } = "";

    /// <summary>Sandbox / inbox ID from Mailtrap URL, e.g. …/sandboxes/1234567</summary>
    public int SandboxId { get; set; }

    public string From { get; set; } = "from@example.com";
    public string FromName { get; set; } = "Survey 360";

    /// <summary>Base URL of the frontend (for invite links), e.g. http://localhost:5173</summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:5173";

    /// <summary>Pause between emails to avoid Mailtrap rate limits and transient API errors.</summary>
    public int DelayBetweenEmailsMs { get; set; } = 2000;

    // SMTP left for reference; outbound SMTP is often blocked on local networks
    public string Host { get; set; } = "sandbox.smtp.mailtrap.io";
    public int Port { get; set; } = 2525;
    public string UserName { get; set; } = "";
    public string Password { get; set; } = "";
}
