namespace WebApp.Services;

internal static class DirectumReportAssets
{
    private static byte[]? _logoBytes;

    public static byte[]? GetLogoBytes()
    {
        if (_logoBytes is not null)
            return _logoBytes;

        var assembly = typeof(DirectumReportAssets).Assembly;
        var resourceName = assembly
            .GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith("Survey360Logo.png", StringComparison.OrdinalIgnoreCase));

        if (resourceName is not null)
        {
            using var resourceStream = assembly.GetManifestResourceStream(resourceName);
            if (resourceStream is not null)
            {
                using var memoryStream = new MemoryStream();
                resourceStream.CopyTo(memoryStream);
                _logoBytes = memoryStream.ToArray();
                return _logoBytes;
            }
        }

        var logoPath = Path.Combine(AppContext.BaseDirectory, "Assets", "Survey360Logo.png");
        if (File.Exists(logoPath))
        {
            _logoBytes = File.ReadAllBytes(logoPath);
            return _logoBytes;
        }

        return null;
    }
}
