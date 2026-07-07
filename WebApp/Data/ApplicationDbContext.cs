using Microsoft.EntityFrameworkCore;
using WebApp.Models;

namespace WebApp.Data;

/*
 * Создание миграций происходит через команду
 * dotnet ef migrations add <Имя миграции>
 * 
 * Применение миграций происходить через команду
 * dotnet ef database update
 */
public class ApplicationDbContext(DbContextOptions options) : DbContext(options)
{
    // Тут указываются настройки суностей: связи, индексы, ограничения и т.п.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }

    // Тут указываются все сущности БД, с которыми нужно уметь работать
    public DbSet<SimpleEntity> SimpleEntities { get; set; }
}
