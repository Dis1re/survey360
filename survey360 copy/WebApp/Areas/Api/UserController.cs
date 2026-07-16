using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Models;

namespace WebApp.Areas.Api;

public record CreateUserRequest(string Name, string Email);

[Area("api")]
[ApiController]
[Route("/api/[controller]")]
public class UserController(ApplicationDbContext context) : Controller
{
    [HttpPost]
    public async Task<int> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            CreatedAt = now,
            UpdatedAt = now,
        };
        await context.Users.AddAsync(user, ct);
        await context.SaveChangesAsync(ct);
        return user.Id;
    }

    [HttpGet]
    public async Task<IEnumerable<User>> List(CancellationToken ct)
    {
        return await context.Users
            .AsNoTracking()
            .OrderBy(u => u.Name)
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<User>> Get(int id, CancellationToken ct)
    {
        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        return user is null ? NotFound() : user;
    }
}
