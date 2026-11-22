using System.Text.Json;
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
public sealed class SessionsController(AppDbContext db) : ControllerBase
{
    [HttpGet("api/projects/{projectId:guid}/sessions")]
    public async Task<ActionResult<IReadOnlyList<StudySessionDto>>> ListByProject(Guid projectId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var sessions = await db.StudySessions
            .AsNoTracking()
            .Where(s => s.ProjectId == projectId && s.UserId == userId)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync(ct);

        return Ok(sessions.Select(MapToDto).ToList());
    }

    [HttpPost("api/sessions")]
    public async Task<ActionResult<StudySessionDto>> Create(CreateStudySessionRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var document = await db.Documents
            .AsNoTracking()
            .FirstOrDefaultAsync(
                d => d.Id == request.DocumentId
                     && d.ProjectId == request.ProjectId
                     && d.Project.Workspace.OwnerId == userId,
                ct);

        if (document is null)
        {
            return NotFound(new { message = "Document not found in this project." });
        }

        var selectedIds = request.SelectedChunkIds ?? [];
        var session = new StudySession
        {
            ProjectId = request.ProjectId,
            DocumentId = request.DocumentId,
            UserId = userId,
            Mode = string.IsNullOrWhiteSpace(request.Mode) ? "3_steps" : request.Mode.Trim(),
            Goal = request.Goal?.Trim(),
            SelectedChunkIdsJson = JsonSerializer.Serialize(selectedIds)
        };

        db.StudySessions.Add(session);
        await db.SaveChangesAsync(ct);

        return Ok(MapToDto(session));
    }

    [HttpPut("api/sessions/{sessionId:guid}/recall")]
    public async Task<ActionResult<StudySessionDto>> SaveRecall(
        Guid sessionId,
        UpdateRecallRequest request,
        CancellationToken ct)
    {
        var userId = User.GetUserId();
        var session = await db.StudySessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);

        if (session is null)
        {
            return NotFound();
        }

        session.RecallText = request.RecallText;
        await db.SaveChangesAsync(ct);
        return Ok(MapToDto(session));
    }

    private static StudySessionDto MapToDto(StudySession s)
    {
        var chunkIds = JsonSerializer.Deserialize<List<Guid>>(s.SelectedChunkIdsJson) ?? [];
        return new StudySessionDto(
            s.Id,
            s.ProjectId,
            s.DocumentId,
            s.Mode,
            s.Goal,
            s.CurrentStep,
            chunkIds,
            s.RecallText,
            s.RecallFeedbackText,
            s.Status.ToString(),
            s.StartedAt,
            s.CompletedAt);
    }
}
