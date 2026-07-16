using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Areas.Api;

public record CreateGroupRequest(string Name, List<int> UserIds);
public record UpdateGroupRequest(string Name, List<int> UserIds);
public record GroupDto(int Id, string Name, List<int> UserIds, int CreatedByUserId, DateTime CreatedAt);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class UserGroupController(ApplicationDbContext context) : Controller
{
    private static GroupDto ToDto(UserGroup g) => new(
        g.Id,
        g.Name,
        System.Text.Json.JsonSerializer.Deserialize<List<int>>(g.UserIds) ?? [],
        g.CreatedByUserId,
        g.CreatedAt
    );

    [HttpGet]
    public async Task<IEnumerable<GroupDto>> List(CancellationToken ct)
    {
        return (await context.UserGroups
            .AsNoTracking()
            .OrderBy(g => g.Name)
            .ToListAsync(ct))
            .Select(ToDto);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GroupDto>> Get(int id, CancellationToken ct)
    {
        var group = await context.UserGroups
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == id, ct);

        return group is null ? NotFound() : ToDto(group);
    }

    [HttpPost]
    public async Task<int> Create([FromBody] CreateGroupRequest request, CancellationToken ct)
    {
        var group = new UserGroup
        {
            Name = request.Name,
            UserIds = System.Text.Json.JsonSerializer.Serialize(request.UserIds),
            CreatedByUserId = 1,
            CreatedAt = DateTime.UtcNow,
        };
        await context.UserGroups.AddAsync(group, ct);
        await context.SaveChangesAsync(ct);
        return group.Id;
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateGroupRequest request, CancellationToken ct)
    {
        var group = await context.UserGroups.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (group is null) return NotFound();

        group.Name = request.Name;
        group.UserIds = System.Text.Json.JsonSerializer.Serialize(request.UserIds);
        await context.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var group = await context.UserGroups.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (group is null) return NotFound();

        context.UserGroups.Remove(group);
        await context.SaveChangesAsync(ct);
        return Ok();
    }
}
