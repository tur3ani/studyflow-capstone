using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using StudyApp.Api.Contracts;

namespace StudyApp.Api.Services;

/// <summary>
/// Production HTTP client that communicates with the Python FastAPI AI service using snake_case JSON.
/// </summary>
public sealed class HttpAiServiceClient(HttpClient httpClient, IConfiguration configuration) : IAiServiceClient
{
    private static readonly JsonSerializerOptions SnakeCaseOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    public string ProviderMode => "python-fastapi";

    public async Task<PythonExtractResponse> ExtractDocumentAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        Guid documentId,
        CancellationToken ct)
    {
        using var form = new MultipartFormDataContent();
        using var fileContent = new StreamContent(fileStream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(
            string.IsNullOrWhiteSpace(contentType) ? "application/pdf" : contentType);

        form.Add(fileContent, "file", fileName);
        form.Add(new StringContent(documentId.ToString()), "document_id");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/documents/extract")
        {
            Content = form
        };
        AttachInternalKey(request);

        using var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PythonExtractResponse>(SnakeCaseOptions, ct);
        return result ?? throw new InvalidOperationException("Python AI service returned an empty extraction payload.");
    }

    public async Task<PythonExplainChunkResponse> ExplainChunkAsync(
        PythonExplainChunkRequest payload,
        CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/ai/explain-chunk")
        {
            Content = JsonContent.Create(payload, options: SnakeCaseOptions)
        };
        AttachInternalKey(request);

        using var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PythonExplainChunkResponse>(SnakeCaseOptions, ct);
        return result ?? throw new InvalidOperationException("Python AI service returned an empty explanation payload.");
    }

    private void AttachInternalKey(HttpRequestMessage request)
    {
        var apiKey = configuration["AiService:InternalApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.TryAddWithoutValidation("X-Internal-Api-Key", apiKey);
        }
    }
}
