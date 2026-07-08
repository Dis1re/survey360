using Microsoft.AspNetCore.Mvc;
using WebApp.Services;

namespace WebApp.Areas.Api;

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class ServicesController(
    TransientTime transientController,
    TransientTime transientView,
    ScopedTime scopedController,
    ScopedTime scopedView,
    SingletonTime singletonController,
    SingletonTime singletonView) : Controller
{
    [HttpGet("lifecycle")]
    public IActionResult Lifecycle() => Ok(new
    {
        Transient = new
        {
            Controller = transientController.GetTime(),
            View = transientView.GetTime()
        },
        Scoped = new
        {
            Controller = scopedController.GetTime(),
            View = scopedView.GetTime()
        },
        Singleton = new
        {
            Controller = singletonController.GetTime(),
            View = singletonView.GetTime()
        }
    });
}
