using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Services;

namespace WebApp.Areas.Api;

public record LoginRequest(string Email);

public record AuthUserDto(int Id, string Name, string Email, bool IsAdmin);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class AuthController(ApplicationDbContext context) : Controller
{
    [HttpPost("login")]
    public async Task<ActionResult<AuthUserDto>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(email))
            return BadRequest("Email обязателен");

        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);

        if (user is null)
            return NotFound("Пользователь с таким email не найден");

        await SignInAsync(user);
        return ToDto(user);
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
            return ToDto(devAdmin);
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
        return ToDto(user);
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

        return user is null ? Unauthorized() : ToDto(user);
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
            return admin;

        const string devEmail = "admin@survey360.local";
        admin = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == devEmail, ct);
        if (admin is not null)
        {
            admin.IsAdmin = true;
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
            CreatedAt = now,
            UpdatedAt = now,
        };
        await context.Users.AddAsync(admin, ct);
        await context.SaveChangesAsync(ct);
        return admin;
    }

    private async Task SignInAsync(Models.User user)
    {
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

    private static AuthUserDto ToDto(Models.User user) =>
        new(user.Id, user.Name, user.Email, user.IsAdmin);
}
