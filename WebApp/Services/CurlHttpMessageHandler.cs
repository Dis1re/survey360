using System.Diagnostics;
using System.Net;
using System.Text;

namespace WebApp.Services;

/// <summary>
/// HttpClient handler that performs requests via curl.
/// Needed on macOS where Apple Secure Transport rejects GigaChat/Sber certificates
/// with "bad certificate format" before any custom validation callback runs.
/// </summary>
public sealed class CurlHttpMessageHandler : HttpMessageHandler
{
    private readonly string? _caCertPath;

    public CurlHttpMessageHandler(string? caCertPath = null)
    {
        _caCertPath = caCertPath;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (request.RequestUri is null)
            throw new InvalidOperationException("Request URI is required");

        var args = new List<string>
        {
            "-sS",
            "-X", request.Method.Method,
            "--max-time", "120",
            "-w", "\n__CURL_HTTP_CODE__:%{http_code}",
        };

        if (!string.IsNullOrWhiteSpace(_caCertPath) && File.Exists(_caCertPath))
        {
            args.Add("--cacert");
            args.Add(_caCertPath);
        }

        foreach (var header in request.Headers)
        {
            foreach (var value in header.Value)
                args.AddRange(["-H", $"{header.Key}: {value}"]);
        }

        byte[]? bodyBytes = null;
        if (request.Content != null)
        {
            foreach (var header in request.Content.Headers)
            {
                foreach (var value in header.Value)
                    args.AddRange(["-H", $"{header.Key}: {value}"]);
            }

            bodyBytes = await request.Content.ReadAsByteArrayAsync(cancellationToken);
            args.AddRange(["--data-binary", "@-"]);
        }

        args.Add(request.RequestUri.AbsoluteUri);

        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "curl",
                RedirectStandardInput = bodyBytes != null,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            }
        };

        foreach (var arg in args)
            process.StartInfo.ArgumentList.Add(arg);

        process.Start();

        if (bodyBytes != null)
        {
            await process.StandardInput.BaseStream.WriteAsync(bodyBytes, cancellationToken);
            process.StandardInput.Close();
        }

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            throw new HttpRequestException(
                $"curl failed (exit {process.ExitCode}): {stderr.Trim()}");
        }

        var codeMarker = "\n__CURL_HTTP_CODE__:";
        var markerIdx = stdout.LastIndexOf(codeMarker, StringComparison.Ordinal);
        if (markerIdx < 0)
            throw new HttpRequestException($"curl response missing status marker. stderr={stderr}");

        var body = stdout[..markerIdx];
        var codeText = stdout[(markerIdx + codeMarker.Length)..].Trim();
        if (!int.TryParse(codeText, out var statusCode))
            throw new HttpRequestException($"curl returned invalid status '{codeText}'");

        return new HttpResponseMessage((HttpStatusCode)statusCode)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
            RequestMessage = request,
        };
    }
}
