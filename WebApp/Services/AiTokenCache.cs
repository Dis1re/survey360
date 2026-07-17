namespace WebApp.Services;

public class AiTokenCache
{
    private string? _token;
    private DateTimeOffset _expiresAt = DateTimeOffset.MinValue;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public bool IsExpired => DateTimeOffset.UtcNow >= _expiresAt;

    public async Task<string?> GetAsync(Func<CancellationToken, Task<string?>> acquireToken, CancellationToken ct)
    {
        if (_token != null && !IsExpired)
            return _token;

        await _lock.WaitAsync(ct);
        try
        {
            if (_token != null && !IsExpired)
                return _token;

            _token = await acquireToken(ct);
            return _token;
        }
        finally
        {
            _lock.Release();
        }
    }

    public void Set(string token, DateTimeOffset expiresAt)
    {
        _token = token;
        _expiresAt = expiresAt;
    }

    public void Invalidate()
    {
        _token = null;
        _expiresAt = DateTimeOffset.MinValue;
    }
}
