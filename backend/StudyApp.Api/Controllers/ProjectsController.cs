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
[Route("api/projects")]
public sealed class ProjectsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectSummaryDto>>> List(CancellationToken ct)
    {
        var userId = User.GetUserId();
        var projects = await db.Projects
            .AsNoTracking()
            .Where(p => p.Workspace.OwnerId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectSummaryDto(
                p.Id,
                p.WorkspaceId,
                p.Name,
                p.CourseCode,
                p.Description,
                p.ExplanationRulesJson,
                p.Documents.Count,
                p.StudyNotes.Count,
                p.CreatedAt))
            .ToListAsync(ct);

        return Ok(projects);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectSummaryDto>> Create(CreateProjectRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var workspace = await db.Workspaces
            .Where(w => w.OwnerId == userId)
            .OrderBy(w => w.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (workspace is null)
        {
            workspace = new Workspace { OwnerId = userId, Name = "My Study Workspace" };
            db.Workspaces.Add(workspace);
        }

        var project = new Project
        {
            Workspace = workspace,
            Name = request.Name.Trim(),
            CourseCode = string.IsNullOrWhiteSpace(request.CourseCode) ? null : request.CourseCode.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            ExplanationRulesJson = string.IsNullOrWhiteSpace(request.ExplanationRulesJson)
                ? """{"defaultLanguage":"ar","preserveEnglishTerms":true,"style":"clear-academic"}"""
                : request.ExplanationRulesJson
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync(ct);

        var dto = new ProjectSummaryDto(
            project.Id,
            project.WorkspaceId,
            project.Name,
            project.CourseCode,
            project.Description,
            project.ExplanationRulesJson,
            0,
            0,
            project.CreatedAt);

        return CreatedAtAction(nameof(List), new { id = project.Id }, dto);
    }

    [HttpDelete("{projectId:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var project = await db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && p.Workspace.OwnerId == userId, ct);

        if (project is null)
        {
            return NotFound();
        }

        db.Projects.Remove(project);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
