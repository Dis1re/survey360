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
            .WithMany(s => s.Questions)
            .HasForeignKey(q => q.SurveyId);
        
        modelBuilder.Entity<Answer>()
            .HasOne<Question>()
            .WithMany(q => q.Answers)
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
        
        modelBuilder.Entity<Answer>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(a => a.UserId);

        modelBuilder.Entity<Answer>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(a => a.TargetId);
    
        modelBuilder.Entity<SurveyAssignment>()
            .HasOne<Survey>()
            .WithMany(s => s.Assignments)
            .HasForeignKey(sa => sa.SurveyId);
        
        modelBuilder.Entity<SurveyAssignment>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(sa => sa.ReviewerId);
            
        modelBuilder.Entity<SurveyAssignment>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(sa => sa.TargetId);

        modelBuilder.Entity<SurveyParticipant>()
            .HasOne<Survey>()
            .WithMany()
            .HasForeignKey(sp => sp.SurveyId);

        modelBuilder.Entity<SurveyParticipant>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(sp => sp.UserId);

        modelBuilder.Entity<SurveyParticipant>()
            .HasIndex(sp => new { sp.SurveyId, sp.UserId })
            .IsUnique();

        modelBuilder.Entity<QuestionTemplate>()
            .HasOne<SurveyTemplate>()
            .WithMany()
            .HasForeignKey(qt => qt.SurveyTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SurveyRespondentLink>()
            .HasOne<Survey>()
            .WithMany()
            .HasForeignKey(l => l.SurveyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SurveyRespondentLink>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(l => l.ReviewerId);

        modelBuilder.Entity<SurveyRespondentLink>()
            .HasIndex(l => l.Token)
            .IsUnique();

        modelBuilder.Entity<SurveyRespondentLink>()
            .HasIndex(l => new { l.SurveyId, l.ReviewerId })
            .IsUnique();
    }

    // Тут указываются все сущности БД, с которыми нужно уметь работать
    public DbSet<User> Users { get; set; }
    public DbSet<Survey> Surveys { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<Answer> Answers { get; set; }
    public DbSet<SurveyAssignment> SurveyAssignments { get; set; }
    public DbSet<SurveyParticipant> SurveyParticipants => Set<SurveyParticipant>();
    public DbSet<SurveyTemplate> SurveyTemplates { get; set; }
    public DbSet<QuestionTemplate> QuestionTemplates { get; set; }
    public DbSet<SurveyRespondentLink> SurveyRespondentLinks => Set<SurveyRespondentLink>();
}
