using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebApp.Data;

namespace WebApp.Areas.Api;

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class SettingsController(IOptions<MySettings> options) : Controller
{
    [HttpGet]
    public MySettings Get() => options.Value;
}
