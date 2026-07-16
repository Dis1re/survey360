using Microsoft.AspNetCore.DataProtection;
using WebApp.Models;

namespace WebApp.Services;

public class AuthTokenService(IDataProtectionProvider dataProtectionProvider)
{
    private const string ProtectorPurpose = "Survey360.AuthToken.v1";
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromDays(30);

    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector(ProtectorPurpose);

    public string CreateToken(User user)
    {
        var expires = DateTimeOffset.UtcNow.Add(TokenLifetime).ToUnixTimeSeconds();
        var payload = $"{user.Id}|{user.Email}|{user.IsAdmin}|{expires}";
        return _protector.Protect(payload);
    }

    public bool TryReadToken(string? token, out int userId)
    {
        userId = 0;
        if (string.IsNullOrWhiteSpace(token))
            return false;

        try
        {
            var payload = _protector.Unprotect(token);
            var parts = payload.Split('|');
            if (parts.Length < 4)
                return false;

            if (!int.TryParse(parts[0], out userId))
                return false;

            if (!long.TryParse(parts[3], out var expiresUnix))
                return false;

            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiresUnix)
                return false;

            return true;
        }
        catch
        {
            return false;
        }
    }
}
