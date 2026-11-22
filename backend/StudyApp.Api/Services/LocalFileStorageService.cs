namespace StudyApp.Api.Services;

public sealed class LocalFileStorageService : IFileStorageService
{
    private readonly string _rootPath;

    public LocalFileStorageService(IConfiguration configuration, IWebHostEnvironment env)
    {
        var configuredPath = configuration["FileStorage:RootPath"] ?? "App_Data/private-files";
        _rootPath = Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.Combine(env.ContentRootPath, configuredPath);
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<string> SaveAsync(
        Guid projectId,
        Guid documentId,
        string originalFileName,
        Stream content,
        CancellationToken ct)
    {
        var ext = Path.GetExtension(originalFileName);
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = ".pdf";
        }

        var safeFileName = $"{documentId:N}{ext.ToLowerInvariant()}";
        var relativeKey = Path.Combine(projectId.ToString("N"), safeFileName).Replace('\\', '/');
        var fullPath = ResolveSafePath(relativeKey);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await content.CopyToAsync(fileStream, ct);

        return relativeKey;
    }

    public Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct)
    {
        var fullPath = ResolveSafePath(storageKey);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException("Stored document file could not be found.", storageKey);
        }

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string storageKey, CancellationToken ct)
    {
        var fullPath = ResolveSafePath(storageKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }

    private string ResolveSafePath(string storageKey)
    {
        var combined = Path.GetFullPath(Path.Combine(_rootPath, storageKey));
        var normalizedRoot = Path.GetFullPath(_rootPath);
        if (!combined.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid storage key path.");
        }

        return combined;
    }
}
