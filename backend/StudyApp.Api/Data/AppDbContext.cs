using Microsoft.EntityFrameworkCore;
using StudyApp.Api.Domain.Entities;

namespace StudyApp.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentChunk> DocumentChunks => Set<DocumentChunk>();
    public DbSet<StudySession> StudySessions => Set<StudySession>();
    public DbSet<StudyNote> StudyNotes => Set<StudyNote>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();
    public DbSet<CalendarEntry> CalendarEntries => Set<CalendarEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(160).IsRequired();
            e.Property(x => x.PasswordHash).IsRequired();
            e.Property(x => x.PreferredLanguage).HasMaxLength(16).IsRequired();
        });

        modelBuilder.Entity<Workspace>(e =>
        {
            e.ToTable("workspaces");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(160).IsRequired();
            e.HasOne(x => x.Owner)
                .WithMany(u => u.Workspaces)
                .HasForeignKey(x => x.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.CourseCode).HasMaxLength(64);
            e.Property(x => x.ExplanationRulesJson).HasColumnType("jsonb").IsRequired();
            e.HasOne(x => x.Workspace)
                .WithMany(w => w.Projects)
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Document>(e =>
        {
            e.ToTable("documents");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.ProjectId, x.CreatedAt });
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.OriginalFileName).HasMaxLength(300).IsRequired();
            e.Property(x => x.ContentType).HasMaxLength(128).IsRequired();
            e.Property(x => x.StorageKey).HasMaxLength(500).IsRequired();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
            e.HasOne(x => x.Project)
                .WithMany(p => p.Documents)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DocumentChunk>(e =>
        {
            e.ToTable("document_chunks");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.DocumentId, x.ChunkIndex }).IsUnique();
            e.HasIndex(x => new { x.DocumentId, x.PageNumber });
            e.Property(x => x.Heading).HasMaxLength(300);
            e.Property(x => x.Content).IsRequired();
            e.HasOne(x => x.Document)
                .WithMany(d => d.Chunks)
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudySession>(e =>
        {
            e.ToTable("study_sessions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Mode).HasMaxLength(64).IsRequired();
            e.Property(x => x.SelectedChunkIdsJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
            e.HasOne(x => x.Project)
                .WithMany(p => p.StudySessions)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Document)
                .WithMany(d => d.StudySessions)
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User)
                .WithMany(u => u.StudySessions)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudyNote>(e =>
        {
            e.ToTable("study_notes");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.ProjectId, x.UpdatedAt });
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.ContentMarkdown).IsRequired();
            e.Property(x => x.Language).HasMaxLength(16).IsRequired();
            e.Property(x => x.SourceType).HasConversion<string>().HasMaxLength(32).IsRequired();
            e.HasOne(x => x.Project)
                .WithMany(p => p.StudyNotes)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Document)
                .WithMany(d => d.StudyNotes)
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Chunk)
                .WithMany(c => c.StudyNotes)
                .HasForeignKey(x => x.ChunkId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Session)
                .WithMany(s => s.StudyNotes)
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.User)
                .WithMany(u => u.StudyNotes)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizQuestion>(e =>
        {
            e.ToTable("quiz_questions");
            e.HasKey(x => x.Id);
            e.Property(x => x.QuestionType).HasMaxLength(32).IsRequired();
            e.Property(x => x.OptionsJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.AnswerKeyJson).HasColumnType("jsonb").IsRequired();
            e.HasOne(x => x.Session)
                .WithMany(s => s.QuizQuestions)
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Document)
                .WithMany()
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Chunk)
                .WithMany(c => c.QuizQuestions)
                .HasForeignKey(x => x.ChunkId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizAttempt>(e =>
        {
            e.ToTable("quiz_attempts");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.AttemptedAt });
            e.Property(x => x.FeedbackStatus).HasConversion<string>().HasMaxLength(32).IsRequired();
            e.HasOne(x => x.Question)
                .WithMany(q => q.Attempts)
                .HasForeignKey(x => x.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Session)
                .WithMany(s => s.QuizAttempts)
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User)
                .WithMany(u => u.QuizAttempts)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CalendarEntry>(e =>
        {
            e.ToTable("calendar_entries");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.ScheduledDate });
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Status).HasMaxLength(32).IsRequired();
            e.HasOne(x => x.User)
                .WithMany(u => u.CalendarEntries)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Project)
                .WithMany(p => p.CalendarEntries)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Session)
                .WithMany(s => s.CalendarEntries)
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
