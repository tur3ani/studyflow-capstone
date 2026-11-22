using StudyApp.Api.Contracts;

namespace StudyApp.Api.Services;

/// <summary>
/// Boundary between the C# ASP.NET Core backend and the Python FastAPI AI service.
/// Switch between MockAiServiceClient and HttpAiServiceClient via appsettings (AiService:UseMock).
/// </summary>
public interface IAiServiceClient
{
    string ProviderMode { get; }

    Task<PythonExtractResponse> ExtractDocumentAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        Guid documentId,
        CancellationToken ct);

    Task<PythonExplainChunkResponse> ExplainChunkAsync(
        PythonExplainChunkRequest request,
        CancellationToken ct);
}
