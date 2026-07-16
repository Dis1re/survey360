namespace WebApp.Services;

public static class PasswordHelper
{
    public const string DefaultPassword = "123456";

    public static string Hash(string password) =>
        BCrypt.Net.BCrypt.HashPassword(password);

    public static string HashDefault() => Hash(DefaultPassword);

    public static bool Verify(string password, string? passwordHash)
    {
        if (string.IsNullOrEmpty(passwordHash))
            return false;

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch
        {
            return false;
        }
    }
}
