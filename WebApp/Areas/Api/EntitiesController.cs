using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Areas.Api;

/*
 * Api работы с сущностью в формате REST
 */
[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class EntitiesController(ApplicationDbContext context) : Controller
{
    [HttpGet]
    public async Task<IEnumerable<SimpleEntity>> Get(CancellationToken cancellationToken)
    {
        return await context.SimpleEntities.AsNoTracking().OrderBy(x => x.Id).ToListAsync(cancellationToken);
    }

    [HttpPost]
    public async Task<int> Post([FromBody] SimpleEntity simpleEntity, CancellationToken cancellationToken)
    {
        await context.SimpleEntities.AddAsync(simpleEntity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return simpleEntity.Id;
    }

    [HttpGet("{id:int}")]
    public Task<SimpleEntity?> Get([FromRoute] int id, CancellationToken cancellationToken)
    {
        return context.SimpleEntities.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }


    [HttpPut("{id:int}")]
    public async Task<IActionResult> Put([FromRoute] int id, [FromBody] SimpleEntity simpleEntity, CancellationToken cancellationToken)
    {
        var entity = await context.SimpleEntities.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity == null)
            return BadRequest();

        entity.Name = simpleEntity.Name;
        entity.Description = simpleEntity.Description;
        entity.Type = simpleEntity.Type;
        await context.SaveChangesAsync(cancellationToken);

        return Ok();
    }

    [HttpDelete("{id:int}")]
    public async Task Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        await context.SimpleEntities.Where(x => x.Id == id).ExecuteDeleteAsync(cancellationToken);

        /*
         * Или можно так
        var entity = await context.SimpleEntities.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        context.SimpleEntities.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);
        */
    }
}
