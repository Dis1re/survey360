using Microsoft.EntityFrameworkCore;
using WebApp.Models;

namespace WebApp.Data;

public class ApplicationDbContext(DbContextOptions options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Survey>()
            .HasOne(s => s.CreatedByUser).WithMany(u => u.CreatedSurveys)
            .HasForeignKey(s => s.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Question>()
            .HasOne(q => q.Survey).WithMany(s => s.Questions)
            .HasForeignKey(q => q.SurveyId);

        modelBuilder.Entity<Answer>()
            .HasOne(a => a.Question).WithMany(q => q.Answers)
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Answer>()
            .HasOne(a => a.User).WithMany(u => u.Answers)
            .HasForeignKey(a => a.UserId);

        modelBuilder.Entity<Answer>()
            .HasOne(a => a.TargetUser).WithMany(u => u.TargetAnswers)
            .HasForeignKey(a => a.TargetId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Answer>()
            .HasIndex(a => new { a.QuestionId, a.UserId, a.TargetId }).IsUnique();

        modelBuilder.Entity<SurveyAssignment>()
            .HasOne(sa => sa.Survey).WithMany(s => s.Assignments)
            .HasForeignKey(sa => sa.SurveyId);

        modelBuilder.Entity<SurveyAssignment>()
            .HasOne(sa => sa.Reviewer).WithMany(u => u.ReviewerAssignments)
            .HasForeignKey(sa => sa.ReviewerId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SurveyAssignment>()
            .HasOne(sa => sa.Target).WithMany(u => u.TargetAssignments)
            .HasForeignKey(sa => sa.TargetId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SurveyAssignment>()
            .HasIndex(sa => new { sa.SurveyId, sa.ReviewerId, sa.TargetId }).IsUnique();

        modelBuilder.Entity<SurveyParticipant>()
            .HasOne(sp => sp.Survey).WithMany(s => s.Participants)
            .HasForeignKey(sp => sp.SurveyId);

        modelBuilder.Entity<SurveyParticipant>()
            .HasOne(sp => sp.User).WithMany(u => u.Participations)
            .HasForeignKey(sp => sp.UserId);

        modelBuilder.Entity<SurveyParticipant>()
            .HasIndex(sp => new { sp.SurveyId, sp.UserId }).IsUnique();

        modelBuilder.Entity<SurveyParticipant>()
            .HasIndex(sp => sp.Token).IsUnique();

        modelBuilder.Entity<QuestionTemplate>()
            .HasOne(qt => qt.SurveyTemplate).WithMany(t => t.QuestionTemplates)
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

        modelBuilder.Entity<UserGroup>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(g => g.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Survey> Surveys { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<Answer> Answers { get; set; }
    public DbSet<SurveyAssignment> SurveyAssignments { get; set; }
    public DbSet<SurveyParticipant> SurveyParticipants => Set<SurveyParticipant>();
    public DbSet<SurveyTemplate> SurveyTemplates { get; set; }
    public DbSet<QuestionTemplate> QuestionTemplates { get; set; }
    public DbSet<SurveyRespondentLink> SurveyRespondentLinks => Set<SurveyRespondentLink>();
    public DbSet<UserGroup> UserGroups { get; set; }
}
