using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;
using WebApp.Services;

namespace WebApp.Areas.Api;

public record CreateUserRequest(string Name, string Email, string? Password = null);

public record ImportResult(int Imported, int Updated, int Skipped, List<string> Errors);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class UserController(ApplicationDbContext context) : Controller
{
    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";
        if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(email))
            return BadRequest("Имя и email обязательны");

        var password = request.Password?.Trim() ?? "";
        if (string.IsNullOrEmpty(password))
            return BadRequest("Пароль обязателен");

        var now = DateTime.UtcNow;
        var user = new User
        {
            Name = name,
            Email = email,
            PasswordHash = PasswordHelper.Hash(password),
            CreatedAt = now,
            UpdatedAt = now,
        };
        await context.Users.AddAsync(user, ct);
        await context.SaveChangesAsync(ct);
        return user.Id;
    }

    [HttpGet]
    public async Task<IEnumerable<User>> List(CancellationToken ct)
    {
        return await context.Users
            .AsNoTracking()
            .OrderBy(u => u.Name)
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<User>> Get(int id, CancellationToken ct)
    {
        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        return user is null ? NotFound() : user;
    }

    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv(CancellationToken ct)
    {
        var users = await context.Users
            .AsNoTracking()
            .OrderBy(u => u.Name)
            .ToListAsync(ct);

        var sb = new StringBuilder();
        sb.AppendLine("Name,Email");
        foreach (var u in users)
        {
            sb.AppendLine($"{EscapeCsv(u.Name)},{EscapeCsv(u.Email)}");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", "users.csv");
    }

    [HttpPost("import-csv")]
    public async Task<ImportResult> ImportCsv(IFormFile file, CancellationToken ct)
    {
        using var reader = new StreamReader(file.OpenReadStream());
        var content = await reader.ReadToEndAsync(ct);
        var lines = content.Split(["\r\n", "\n", "\r"], StringSplitOptions.RemoveEmptyEntries);

        if (lines.Length < 2)
            return new ImportResult(0, 0, 0, ["CSV файл пуст или содержит только заголовок"]);

        var header = lines[0].Trim();
        if (!header.Equals("Name,Email", StringComparison.OrdinalIgnoreCase))
            return new ImportResult(0, 0, 0, ["Неверный формат заголовка. Ожидается: Name,Email"]);

        var imported = 0;
        var updated = 0;
        var skipped = 0;
        var errors = new List<string>();

        var existingUsers = await context.Users
            .AsNoTracking()
            .ToListAsync(ct);
        var existingByEmail = existingUsers.ToDictionary(u => u.Email, StringComparer.OrdinalIgnoreCase);

        for (var i = 1; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (string.IsNullOrEmpty(line)) continue;

            var parts = ParseCsvLine(line);
            if (parts.Length < 2)
            {
                errors.Add($"Строка {i + 1}: недостаточно колонок");
                skipped++;
                continue;
            }

            var name = parts[0].Trim();
            var email = parts[1].Trim();

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email))
            {
                errors.Add($"Строка {i + 1}: пустое имя или email");
                skipped++;
                continue;
            }

            if (existingByEmail.TryGetValue(email, out var existing))
            {
                if (existing.Name != name)
                {
                    existing.Name = name;
                    existing.UpdatedAt = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    skipped++;
                }
            }
            else
            {
                var now = DateTime.UtcNow;
                context.Users.Add(new User
                {
                    Name = name,
                    Email = email,
                    PasswordHash = PasswordHelper.HashDefault(),
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                existingByEmail[email] = new User { Name = name, Email = email };
                imported++;
            }
        }

        if (imported + updated > 0)
            await context.SaveChangesAsync(ct);

        return new ImportResult(imported, updated, skipped, errors);
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string[] ParseCsvLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (inQuotes)
            {
                if (c == '"' && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else if (c == '"')
                {
                    inQuotes = false;
                }
                else
                {
                    current.Append(c);
                }
            }
            else
            {
                if (c == '"')
                {
                    inQuotes = true;
                }
                else if (c == ',')
                {
                    result.Add(current.ToString());
                    current.Clear();
                }
                else
                {
                    current.Append(c);
                }
            }
        }
        result.Add(current.ToString());
        return result.ToArray();
    }
}
