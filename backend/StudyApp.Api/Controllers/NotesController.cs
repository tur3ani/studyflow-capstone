using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyApp.Api.Contracts;
using StudyApp.Api.Data;
using StudyApp.Api.Domain.Entities;
using StudyApp.Api.Extensions;

namespace StudyApp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notes")]
public sealed class NotesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudyNoteDto>>> List(
        [FromQuery] Guid? projectId,
        [FromQuery] Guid? documentId,
        CancellationToken ct)
    {
        var userId = User.GetUserId();
        var query = db.StudyNotes
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (projectId.HasValue)
        {
            query = query.Where(n => n.ProjectId == projectId.Value);
        }

        if (documentId.HasValue)
        {
            query = query.Where(n => n.DocumentId == documentId.Value);
        }

        var notes = await query
            .OrderByDescending(n => n.UpdatedAt)
            .Select(n => new StudyNoteDto(
                n.Id,
                n.ProjectId,
                n.DocumentId,
                n.Document != null ? n.Document.Title : null,
                n.ChunkId,
                n.Chunk != null ? n.Chunk.ChunkIndex : null,
                n.SessionId,
                n.Title,
                n.ContentMarkdown,
                n.SourcePageNumber,
                n.Language,
                n.SourceType.ToString(),
                n.Version,
                n.CreatedAt,
                n.UpdatedAt))
            .ToListAsync(ct);

        return Ok(notes);
    }

    [HttpPost]
    public async Task<ActionResult<StudyNoteDto>> Create(CreateNoteRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();

        var ownsProject = await db.Projects.AnyAsync(
            p => p.Id == request.ProjectId && p.Workspace.OwnerId == userId, ct);
        if (!ownsProject)
        {
            return NotFound(new { message = "Project not found." });
        }

        int? resolvedPage = request.SourcePageNumber;
        Guid? resolvedDocumentId = request.DocumentId;

        if (request.ChunkId.HasValue)
        {
            var chunk = await db.DocumentChunks
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    c => c.Id == request.ChunkId.Value && c.Document.ProjectId == request.ProjectId,
                    ct);

            if (chunk is null)
            {
                return BadRequest(new { message = "Referenced chunk does not belong to this project." });
            }

            resolvedDocumentId = chunk.DocumentId;
            resolvedPage ??= chunk.PageNumber;
        }

        var sourceType = Enum.TryParse<NoteSourceType>(request.SourceType, ignoreCase: true, out var parsed)
            ? parsed
            : NoteSourceType.AiExplanationEdited;

        var note = new StudyNote
        {
            ProjectId = request.ProjectId,
            DocumentId = resolvedDocumentId,
            ChunkId = request.ChunkId,
            SessionId = request.SessionId,
            UserId = userId,
            Title = request.Title.Trim(),
            ContentMarkdown = request.ContentMarkdown,
            SourcePageNumber = resolvedPage,
            Language = string.IsNullOrWhiteSpace(request.Language) ? "ar" : request.Language.Trim(),
            SourceType = sourceType
        };

        db.StudyNotes.Add(note);
        await db.SaveChangesAsync(ct);

        var dto = await LoadNoteDtoAsync(note.Id, ct);
        return CreatedAtAction(nameof(List), new { projectId = note.ProjectId }, dto);
    }

    [HttpPut("{noteId:guid}")]
    public async Task<ActionResult<StudyNoteDto>> Update(Guid noteId, UpdateNoteRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var note = await db.StudyNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId, ct);
        if (note is null)
        {
            return NotFound();
        }

        if (note.Version != request.ExpectedVersion)
        {
            return Conflict(new
            {
                message = "This note was modified elsewhere. Please reload before saving.",
                currentVersion = note.Version
            });
        }

        note.Title = request.Title.Trim();
        note.ContentMarkdown = request.ContentMarkdown;
        note.Version += 1;
        note.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        var dto = await LoadNoteDtoAsync(note.Id, ct);
        return Ok(dto);
    }

    [HttpDelete("{noteId:guid}")]
    public async Task<IActionResult> Delete(Guid noteId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var note = await db.StudyNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId, ct);
        if (note is null)
        {
            return NotFound();
        }

        db.StudyNotes.Remove(note);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Task<StudyNoteDto?> LoadNoteDtoAsync(Guid noteId, CancellationToken ct)
    {
        return db.StudyNotes
            .AsNoTracking()
            .Where(n => n.Id == noteId)
            .Select(n => new StudyNoteDto(
                n.Id,
                n.ProjectId,
                n.DocumentId,
                n.Document != null ? n.Document.Title : null,
                n.ChunkId,
                n.Chunk != null ? n.Chunk.ChunkIndex : null,
                n.SessionId,
                n.Title,
                n.ContentMarkdown,
                n.SourcePageNumber,
                n.Language,
                n.SourceType.ToString(),
                n.Version,
                n.CreatedAt,
                n.UpdatedAt))
            .FirstOrDefaultAsync(ct);
    }
}
