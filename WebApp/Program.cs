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

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
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
builder.Services.AddScoped<SurveyRespondentLinkService>();
builder.Services.AddHttpClient<EmailService>();
builder.Services.AddScoped<SurveyInviteEmailService>();

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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<SurveyHub>("/hubs/survey");

app.Run();
