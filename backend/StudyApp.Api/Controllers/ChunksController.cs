using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyApp.Api.Contracts;
using StudyApp.Api.Data;
using StudyApp.Api.Extensions;
using StudyApp.Api.Services;

namespace StudyApp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/chunks")]
public sealed class ChunksController(AppDbContext db, IAiServiceClient aiService) : ControllerBase
{
    /// <summary>
    /// Explains a specific chunk in the requested language without writing a note.
    /// Saving a note is intentionally a separate action (POST /api/notes).
    /// </summary>
    [HttpPost("{chunkId:guid}/explain")]
    public async Task<ActionResult<ExplainChunkResponse>> Explain(
        Guid chunkId,
        ExplainChunkRequest request,
        CancellationToken ct)
    {
        var userId = User.GetUserId();

        var chunk = await db.DocumentChunks
            .AsNoTracking()
            .Include(c => c.Document)
            .ThenInclude(d => d.Project)
            .FirstOrDefaultAsync(
                c => c.Id == chunkId && c.Document.Project.Workspace.OwnerId == userId,
                ct);

        if (chunk is null)
        {
            return NotFound(new { message = "Paragraph chunk not found in your projects." });
        }

        var pythonRequest = new PythonExplainChunkRequest(
            DocumentId: chunk.DocumentId,
            ChunkId: chunk.Id,
            PageNumber: chunk.PageNumber,
            Heading: chunk.Heading,
            PassageText: chunk.Content,
            TargetLanguage: string.IsNullOrWhiteSpace(request.TargetLanguage) ? "ar" : request.TargetLanguage.Trim(),
            Mode: string.IsNullOrWhiteSpace(request.Mode) ? "explain_concept" : request.Mode.Trim(),
            SelectedTerm: request.SelectedTerm,
            ExplanationRulesJson: chunk.Document.Project.ExplanationRulesJson);

        var aiResult = await aiService.ExplainChunkAsync(pythonRequest, ct);

        return Ok(new ExplainChunkResponse(
            DocumentId: chunk.DocumentId,
            ChunkId: chunk.Id,
            SourcePageNumber: aiResult.SourcePageNumber > 0 ? aiResult.SourcePageNumber : chunk.PageNumber,
            Heading: chunk.Heading,
            TargetLanguage: pythonRequest.TargetLanguage,
            Explanation: aiResult.Explanation,
            KeyTerms: aiResult.KeyTerms,
            SuggestedNoteTitle: aiResult.SuggestedNoteTitle,
            ProviderMode: aiService.ProviderMode));
    }
}
