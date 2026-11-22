namespace StudyApp.Api.Services;

public interface IFileStorageService
{
    Task<string> SaveAsync(Guid projectId, Guid documentId, string originalFileName, Stream content, CancellationToken ct);
    Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct);
    Task DeleteAsync(string storageKey, CancellationToken ct);
}
