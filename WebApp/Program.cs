using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Hubs;
using WebApp.Services;

var builder = WebApplication.CreateBuilder(args);

var keysDirectory = new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "keys"));
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(keysDirectory);

var connectionString = builder.Configuration.GetConnectionString("SqliteConnection");
builder.Services.AddDbContextPool<ApplicationDbContext>(options => options.UseSqlite(connectionString));

var mySettingsSection = builder.Configuration.GetSection("MySettings");
builder.Services.Configure<MySettings>(mySettingsSection);
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection(EmailSettings.SectionName));
builder.Services.Configure<AiSummaryOptions>(builder.Configuration.GetSection(AiSummaryOptions.SectionName));

builder.Services.AddTransient<TransientTime>();
builder.Services.AddScoped<ScopedTime>();
builder.Services.AddSingleton<SingletonTime>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<AuthTokenService>();

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = "Smart";
        options.DefaultChallengeScheme = "Smart";
    })
    .AddPolicyScheme("Smart", "Bearer or Cookie", options =>
    {
        options.ForwardDefaultSelector = context =>
        {
            var header = context.Request.Headers.Authorization.ToString();
            if (!string.IsNullOrEmpty(header) && header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                return BearerTokenAuthHandler.SchemeName;
            return CookieAuthenticationDefaults.AuthenticationScheme;
        };
    })
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, BearerTokenAuthHandler>(
        BearerTokenAuthHandler.SchemeName, _ => { })
    .AddCookie(options =>
    {
        options.Cookie.Name = "Survey360.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.Path = "/";
        options.ExpireTimeSpan = TimeSpan.FromDays(30);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddScoped<SurveyDocxReportService>();
builder.Services.AddScoped<SurveyCsvReportService>();
builder.Services.AddScoped<SurveyXlsxReportService>();
builder.Services.AddScoped<SurveyRespondentLinkService>();
builder.Services.AddHttpClient<EmailService>();
builder.Services.AddScoped<SurveyInviteEmailService>();
builder.Services.AddSingleton<AiTokenCache>();
builder.Services.AddScoped<AiSummaryService>();

var russianCaCertPath = Path.Combine(builder.Environment.ContentRootPath, "russian_trusted_root_ca.pem");
var aiOptions = builder.Configuration.GetSection(AiSummaryOptions.SectionName).Get<AiSummaryOptions>() ?? new();
var useCurlForAi = OperatingSystem.IsMacOS()
    && aiOptions.AuthType.Equals("oauth", StringComparison.OrdinalIgnoreCase)
    && File.Exists(russianCaCertPath);

builder.Services.AddHttpClient("Ai").ConfigurePrimaryHttpMessageHandler(() =>
{
    // macOS Apple Secure Transport rejects GigaChat/Sber certs with "bad certificate format"
    // before ServerCertificateCustomValidationCallback runs. curl + OpenSSL works.
    if (useCurlForAi)
        return new CurlHttpMessageHandler(russianCaCertPath);

    var handler = new HttpClientHandler();
    if (aiOptions.AuthType.Equals("oauth", StringComparison.OrdinalIgnoreCase)
        && File.Exists(russianCaCertPath))
    {
        var caCert = X509Certificate2.CreateFromPem(File.ReadAllText(russianCaCertPath));
        handler.ServerCertificateCustomValidationCallback = (_, cert, _, errors) =>
        {
            if (errors == SslPolicyErrors.None) return true;
            if (cert == null) return false;

            using var chain = new X509Chain();
            chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
            chain.ChainPolicy.CustomTrustStore.Add(caCert);
            chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
            return chain.Build(cert is X509Certificate2 c ? c : new X509Certificate2(cert));
        };
    }
    return handler;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();

    var usersWithoutPassword = await db.Users
        .Where(u => u.PasswordHash == null || u.PasswordHash == "")
        .ToListAsync();
    if (usersWithoutPassword.Count > 0)
    {
        var hash = PasswordHelper.HashDefault();
        var now = DateTime.UtcNow;
        foreach (var user in usersWithoutPassword)
        {
            user.PasswordHash = hash;
            user.UpdatedAt = now;
        }
        await db.SaveChangesAsync();
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}
else
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();
// SignalR sends the tab token as ?access_token= — promote it to Authorization for Smart auth.
app.Use(async (context, next) =>
{
    if (string.IsNullOrEmpty(context.Request.Headers.Authorization)
        && context.Request.Query.TryGetValue("access_token", out var accessToken)
        && !string.IsNullOrEmpty(accessToken))
    {
        context.Request.Headers.Authorization = $"Bearer {accessToken}";
    }

    await next();
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<SurveyHub>("/hubs/survey");

app.Run();
