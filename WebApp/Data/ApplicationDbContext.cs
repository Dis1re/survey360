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

        modelBuilder.Entity<Questions>()
            .HasOne<Surveys>()
            .WithMany()
            .HasForeignKey(q => q.SurveyId);
        
        modelBuilder.Entity<Answers>()
            .HasOne<Questions>()
            .WithMany()
            .HasForeignKey(a => a.QuestionId);
        
        modelBuilder.Entity<Answers>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(a => a.UserId);
    
        modelBuilder.Entity<SurveyAssignments>()
            .HasOne<Surveys>()
            .WithMany()
            .HasForeignKey(sa => sa.SurveyId);
        
        modelBuilder.Entity<SurveyAssignments>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(sa => sa.ReviewerId);
            
        modelBuilder.Entity<SurveyAssignments>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(sa => sa.TargetId);
    }

    // Тут указываются все сущности БД, с которыми нужно уметь работать
    public DbSet<User> Users { get; set; }
    public DbSet<Surveys> Surveys { get; set; }
    public DbSet<Questions> Questions { get; set; }
    public DbSet<Answers> Answers { get; set; }
    public DbSet<SurveyAssignments> SurveyAssignments { get; set; }
}
