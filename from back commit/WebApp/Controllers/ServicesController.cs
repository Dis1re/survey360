using Microsoft.AspNetCore.Mvc;
using WebApp.Models;
using WebApp.Services;

namespace WebApp.Controllers;
public class ServicesController(TransientTime transientTime, ScopedTime scopedTime, SingletonTime singletonTime) : Controller
{
    public IActionResult Index()
    {
        var model = new TimeExample()
        {
            TransientTime = transientTime.GetTime(),
            ScopedTime = scopedTime.GetTime(),
            SingletonTime = singletonTime.GetTime()
        };

        return View(model);
    }
}
