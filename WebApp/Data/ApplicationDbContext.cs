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

        modelBuilder.Entity<Question>()
            .HasOne<Survey>()
            .WithMany()
            .HasForeignKey(q => q.SurveyId);
        
        modelBuilder.Entity<Answer>()
            .HasOne<Question>()
            .WithMany()
            .HasForeignKey(a => a.QuestionId);
        
        modelBuilder.Entity<Answer>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(a => a.UserId);
    
        modelBuilder.Entity<SurveyAssignment>()
            .HasOne<Survey>()
            .WithMany()
            .HasForeignKey(sa => sa.SurveyId);
        
        modelBuilder.Entity<SurveyAssignment>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(sa => sa.ReviewerId);
            
        modelBuilder.Entity<SurveyAssignment>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(sa => sa.TargetId);
    }

    // Тут указываются все сущности БД, с которыми нужно уметь работать
    public DbSet<User> Users { get; set; }
    public DbSet<Survey> Surveys { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<Answer> Answers { get; set; }
    public DbSet<SurveyAssignment> SurveyAssignments { get; set; }
}
