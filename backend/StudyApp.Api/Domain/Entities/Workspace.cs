namespace StudyApp.Api.Domain.Entities;

public sealed class Workspace
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User Owner { get; set; } = null!;
    public ICollection<Project> Projects { get; set; } = [];
}
