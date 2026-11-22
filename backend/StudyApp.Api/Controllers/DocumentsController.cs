using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyApp.Api.Contracts;
using StudyApp.Api.Data;
using StudyApp.Api.Domain.Entities;
using StudyApp.Api.Extensions;
using StudyApp.Api.Services;

namespace StudyApp.Api.Controllers;

[ApiController]
[Authorize]
public sealed class DocumentsController(
    AppDbContext db,
    IFileStorageService fileStorage,
    IAiServiceClient aiService,
    ILogger<DocumentsController> logger) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".txt", ".md"
    };

    [HttpGet("api/projects/{projectId:guid}/documents")]
    public async Task<ActionResult<IReadOnlyList<DocumentSummaryDto>>> ListByProject(Guid projectId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var ownsProject = await db.Projects.AnyAsync(p => p.Id == projectId && p.Workspace.OwnerId == userId, ct);
        if (!ownsProject)
        {
            return NotFound(new { message = "Project not found." });
        }

        var docs = await db.Documents
            .AsNoTracking()
            .Where(d => d.ProjectId == projectId)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new DocumentSummaryDto(
                d.Id,
                d.ProjectId,
                d.Title,
                d.OriginalFileName,
                d.FileSizeBytes,
                d.Status.ToString(),
                d.PageCount,
                d.Chunks.Count,
                d.ErrorMessage,
                d.CreatedAt,
                d.UpdatedAt))
            .ToListAsync(ct);

        return Ok(docs);
    }

    [HttpPost("api/projects/{projectId:guid}/documents")]
    [RequestSizeLimit(52_428_800)] // 50 MB
    public async Task<ActionResult<DocumentDetailDto>> Upload(
        Guid projectId,
        [FromForm] IFormFile file,
        [FromForm] string? title,
        CancellationToken ct)
    {
        var userId = User.GetUserId();
        var project = await db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && p.Workspace.OwnerId == userId, ct);

        if (project is null)
        {
            return NotFound(new { message = "Project not found." });
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "Please upload a non-empty PDF, TXT, or MD file." });
        }

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Unsupported file type. Allowed formats: .pdf, .txt, .md" });
        }

        var docId = Guid.NewGuid();
        await using var uploadStream = file.OpenReadStream();
        return await ProcessNewDocumentAsync(project, docId, file, title, uploadStream, ct);
    }

    private async Task<ActionResult<DocumentDetailDto>> ProcessNewDocumentAsync(
        Project project,
        Guid docId,
        IFormFile file,
        string? title,
        Stream uploadStream,
        CancellationToken ct)
    {
        var storageKey = await fileStorage.SaveAsync(project.Id, docId, file.FileName, uploadStream, ct);

        var document = new Document
        {
            Id = docId,
            ProjectId = project.Id,
            Title = SanitizeForPostgres(
                string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
                maxLength: 300) ?? "Untitled Document",
            OriginalFileName = SanitizeForPostgres(file.FileName, maxLength: 300) ?? "document.pdf",
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/pdf" : file.ContentType,
            FileSizeBytes = file.Length,
            StorageKey = storageKey,
            Status = DocumentStatus.Processing
        };

        db.Documents.Add(document);
        await db.SaveChangesAsync(ct);

        await ExtractAndStoreChunksAsync(document, ct);

        var dto = await LoadDocumentDetailAsync(document.Id, ct);
        return CreatedAtAction(nameof(GetById), new { documentId = document.Id }, dto);
    }

    [HttpPost("api/documents/{documentId:guid}/reprocess")]
    public async Task<ActionResult<DocumentDetailDto>> Reprocess(Guid documentId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var document = await db.Documents
            .Include(d => d.Chunks)
            .FirstOrDefaultAsync(d => d.Id == documentId && d.Project.Workspace.OwnerId == userId, ct);

        if (document is null)
        {
            return NotFound();
        }

        db.DocumentChunks.RemoveRange(document.Chunks);
        document.Status = DocumentStatus.Processing;
        document.ErrorMessage = null;
        document.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await ExtractAndStoreChunksAsync(document, ct);

        var dto = await LoadDocumentDetailAsync(document.Id, ct);
        return Ok(dto);
    }

    [HttpGet("api/documents/{documentId:guid}")]
    public async Task<ActionResult<DocumentDetailDto>> GetById(Guid documentId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var owns = await db.Documents.AnyAsync(d => d.Id == documentId && d.Project.Workspace.OwnerId == userId, ct);
        if (!owns)
        {
            return NotFound();
        }

        var dto = await LoadDocumentDetailAsync(documentId, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("api/documents/{documentId:guid}/file")]
    public async Task<IActionResult> StreamOriginalFile(Guid documentId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var document = await db.Documents
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId && d.Project.Workspace.OwnerId == userId, ct);

        if (document is null)
        {
            return NotFound();
        }

        var stream = await fileStorage.OpenReadAsync(document.StorageKey, ct);
        return File(stream, document.ContentType, enableRangeProcessing: true);
    }

    [HttpDelete("api/documents/{documentId:guid}")]
    public async Task<IActionResult> Delete(Guid documentId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var document = await db.Documents
            .FirstOrDefaultAsync(d => d.Id == documentId && d.Project.Workspace.OwnerId == userId, ct);

        if (document is null)
        {
            return NotFound();
        }

        var storageKey = document.StorageKey;
        db.Documents.Remove(document);
        await db.SaveChangesAsync(ct);
        await fileStorage.DeleteAsync(storageKey, ct);

        return NoContent();
    }

    private async Task ExtractAndStoreChunksAsync(Document document, CancellationToken ct)
    {
        try
        {
            await using var storedStream = await fileStorage.OpenReadAsync(document.StorageKey, ct);
            var extraction = await aiService.ExtractDocumentAsync(
                storedStream,
                document.OriginalFileName,
                document.ContentType,
                document.Id,
                ct);

            var entities = extraction.Chunks
                .OrderBy(c => c.ChunkIndex)
                .Select(c => new DocumentChunk
                {
                    DocumentId = document.Id,
                    ChunkIndex = c.ChunkIndex,
                    PageNumber = Math.Max(1, c.PageNumber),
                    Heading = SanitizeForPostgres(c.Heading, maxLength: 300),
                    Content = SanitizeForPostgres(c.Content) ?? string.Empty,
                    CharStart = c.CharStart,
                    CharEnd = c.CharEnd,
                    NeedsOcr = c.NeedsOcr
                })
                .ToList();

            db.DocumentChunks.AddRange(entities);
            document.PageCount = Math.Max(1, extraction.PageCount);
            document.Status = DocumentStatus.Ready;
            document.ErrorMessage = null;
            document.UpdatedAt = DateTimeOffset.UtcNow;

            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Document extraction failed for {DocumentId}", document.Id);

            // Detach any unsaved chunks so updating the document status to Failed cannot re-trigger the same DB error.
            foreach (var entry in db.ChangeTracker.Entries<DocumentChunk>()
                         .Where(e => e.State == EntityState.Added)
                         .ToList())
            {
                entry.State = EntityState.Detached;
            }

            document.Status = DocumentStatus.Failed;
            document.ErrorMessage = SanitizeForPostgres(ex.InnerException?.Message ?? ex.Message, maxLength: 1000);
            document.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    private static string? SanitizeForPostgres(string? input, int? maxLength = null)
    {
        if (input is null)
        {
            return null;
        }

        // PostgreSQL UTF-8 text columns strictly reject NUL (0x00) bytes, which frequently appear in PDF font CMaps.
        var cleaned = input.Replace("\0", string.Empty);

        if (maxLength.HasValue && cleaned.Length > maxLength.Value)
        {
            cleaned = cleaned[..maxLength.Value];
        }

        return cleaned;
    }

    private async Task<DocumentDetailDto?> LoadDocumentDetailAsync(Guid documentId, CancellationToken ct)
    {
        return await db.Documents
            .AsNoTracking()
            .Where(d => d.Id == documentId)
            .Select(d => new DocumentDetailDto(
                d.Id,
                d.ProjectId,
                d.Title,
                d.OriginalFileName,
                d.FileSizeBytes,
                d.Status.ToString(),
                d.PageCount,
                d.ErrorMessage,
                d.CreatedAt,
                d.Chunks
                    .OrderBy(c => c.ChunkIndex)
                    .Select(c => new DocumentChunkDto(
                        c.Id,
                        c.DocumentId,
                        c.ChunkIndex,
                        c.PageNumber,
                        c.Heading,
                        c.Content,
                        c.NeedsOcr))
                    .ToList()))
            .FirstOrDefaultAsync(ct);
    }
}
