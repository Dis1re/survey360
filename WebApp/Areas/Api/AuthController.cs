using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Services;

namespace WebApp.Areas.Api;

public record LoginRequest(string Email, string? Password = null);

public record AuthUserDto(int Id, string Name, string Email, bool IsAdmin, string? Token = null);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class AuthController(ApplicationDbContext context, AuthTokenService tokens) : Controller
{
    [HttpPost("login")]
    public async Task<ActionResult<AuthUserDto>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(email))
            return BadRequest("Email обязателен");

        if (string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Пароль обязателен");

        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);

        if (user is null)
            return NotFound("Пользователь с таким email не найден");

        if (!PasswordHelper.Verify(request.Password, user.PasswordHash))
            return Unauthorized("Неверный пароль");

        await SignInAsync(user);
        return ToDto(user, includeToken: true);
    }

    [HttpPost("admin-login")]
    public async Task<ActionResult<AuthUserDto>> AdminLogin([FromBody] LoginRequest request, CancellationToken ct)
    {
        var raw = request.Email.Trim();
        if (string.IsNullOrEmpty(raw))
            return BadRequest("Email обязателен");

        if (raw.Equals("Admin", StringComparison.OrdinalIgnoreCase)
            || raw.Equals("Админ", StringComparison.OrdinalIgnoreCase))
        {
            var devAdmin = await EnsureDevAdminAsync(ct);
            await SignInAsync(devAdmin);
            return ToDto(devAdmin, includeToken: true);
        }

        var email = raw.ToLowerInvariant();
        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);

        if (user is null)
            return NotFound("Пользователь с таким email не найден");

        if (!user.IsAdmin)
            return Forbid();

        await SignInAsync(user);
        return ToDto(user, includeToken: true);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserDto>> Me(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null)
            return Unauthorized();

        // Re-issue tab token so a cookie-only session can be pinned to this browser tab
        return ToDto(user, includeToken: true);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private async Task<Models.User> EnsureDevAdminAsync(CancellationToken ct)
    {
        var admin = await context.Users.FirstOrDefaultAsync(u => u.IsAdmin, ct);
        if (admin is not null)
        {
            if (string.IsNullOrEmpty(admin.PasswordHash))
            {
                admin.PasswordHash = PasswordHelper.HashDefault();
                admin.UpdatedAt = DateTime.UtcNow;
                await context.SaveChangesAsync(ct);
            }
            return admin;
        }

        const string devEmail = "admin@survey360.local";
        admin = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == devEmail, ct);
        if (admin is not null)
        {
            admin.IsAdmin = true;
            if (string.IsNullOrEmpty(admin.PasswordHash))
                admin.PasswordHash = PasswordHelper.HashDefault();
            admin.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync(ct);
            return admin;
        }

        var now = DateTime.UtcNow;
        admin = new Models.User
        {
            Name = "Admin",
            Email = devEmail,
            IsAdmin = true,
            PasswordHash = PasswordHelper.HashDefault(),
            CreatedAt = now,
            UpdatedAt = now,
        };
        await context.Users.AddAsync(admin, ct);
        await context.SaveChangesAsync(ct);
        return admin;
    }

    private async Task SignInAsync(Models.User user)
    {
        // Cookie kept as a fallback for SignalR / first load of a brand-new tab.
        // Tab identity is primarily the bearer token stored in sessionStorage.
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            AuthExtensions.CreatePrincipal(user),
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddDays(30),
            });
    }

    private AuthUserDto ToDto(Models.User user, bool includeToken) =>
        new(user.Id, user.Name, user.Email, user.IsAdmin, includeToken ? tokens.CreateToken(user) : null);
}
