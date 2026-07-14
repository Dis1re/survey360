using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using WebApp.Models;

namespace WebApp.Services;

public static class AuthExtensions
{
    public const string UserIdClaim = "user_id";
    public const string IsAdminClaim = "is_admin";

    public static int? GetUserId(this ClaimsPrincipal? user)
    {
        var value = user?.FindFirstValue(UserIdClaim);
        return int.TryParse(value, out var id) ? id : null;
    }

    public static bool IsAdmin(this ClaimsPrincipal? user) =>
        user?.FindFirstValue(IsAdminClaim) == "true";

    public static ClaimsPrincipal CreatePrincipal(User user) =>
        new(new ClaimsIdentity(
        [
            new Claim(UserIdClaim, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(IsAdminClaim, user.IsAdmin ? "true" : "false"),
        ],
        CookieAuthenticationDefaults.AuthenticationScheme));
}
