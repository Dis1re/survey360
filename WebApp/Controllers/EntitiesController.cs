using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;

namespace WebApp.Controllers;

public class EntitiesController(ApplicationDbContext context) : Controller
{
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var entities = await context.SimpleEntities.OrderBy(x => x.Id).ToListAsync(cancellationToken);

        return View(entities);
    }

    public async Task<IActionResult> Entity([FromRoute] int id, CancellationToken cancellationToken)
    {
        var entity = await context.SimpleEntities.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity == null)
            return NotFound();

        return View(entity);
    }
}
