using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Controllers;

public class HomeController(ILogger<HomeController> logger, IOptions<MySettings> options) : Controller
{
    private readonly MySettings _settings = options.Value;

    public IActionResult Index()
    {
        // Вызывает рендер вьюшки по пути /Views/Home/Index
        return View(_settings);
    }

    public IActionResult Help()
    {
        // Вызывает рендер вьюшки по пути /Views/Home/Help
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        var requestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        logger.LogWarning("Обращение к методу ошибки RequestId={RequestId}", requestId);
        return View(new ErrorViewModel { RequestId = requestId });
    }
}
