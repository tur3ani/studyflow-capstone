using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyApp.Api.Contracts;
using StudyApp.Api.Data;
using StudyApp.Api.Domain.Entities;
using StudyApp.Api.Extensions;
using StudyApp.Api.Services;

namespace StudyApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    AppDbContext db,
    ITokenService tokenService,
    IPasswordHasher<User> passwordHasher) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await db.Users.AnyAsync(u => u.Email == normalizedEmail, ct);
        if (exists)
        {
            return Conflict(new { message = "An account with this email already exists." });
        }

        var user = new User
        {
            Email = normalizedEmail,
            DisplayName = request.DisplayName.Trim(),
            PreferredLanguage = string.IsNullOrWhiteSpace(request.PreferredLanguage) ? "ar" : request.PreferredLanguage.Trim()
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        var workspace = new Workspace
        {
            Owner = user,
            Name = "My Study Workspace"
        };

        var starterProject = new Project
        {
            Workspace = workspace,
            Name = "Cloud Computing",
            CourseCode = "CS401",
            Description = "Starter course project. Upload lecture PDFs, generate Arabic explanations with English technical terms, and save source-linked notes."
        };

        db.Users.Add(user);
        db.Workspaces.Add(workspace);
        db.Projects.Add(starterProject);
        await db.SaveChangesAsync(ct);

        var (token, expiresAt) = tokenService.CreateAccessToken(user);
        return Ok(new AuthResponse(
            token,
            expiresAt,
            new UserDto(user.Id, user.Email, user.DisplayName, user.PreferredLanguage, user.DailyGoalPoints, workspace.Id)));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users
            .Include(u => u.Workspaces)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var workspace = user.Workspaces.OrderBy(w => w.CreatedAt).FirstOrDefault();
        if (workspace is null)
        {
            workspace = new Workspace { OwnerId = user.Id, Name = "My Study Workspace" };
            db.Workspaces.Add(workspace);
            await db.SaveChangesAsync(ct);
        }

        var (token, expiresAt) = tokenService.CreateAccessToken(user);
        return Ok(new AuthResponse(
            token,
            expiresAt,
            new UserDto(user.Id, user.Email, user.DisplayName, user.PreferredLanguage, user.DailyGoalPoints, workspace.Id)));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        var userId = User.GetUserId();
        var user = await db.Users
            .Include(u => u.Workspaces)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null)
        {
            return Unauthorized();
        }

        var defaultWorkspaceId = user.Workspaces.OrderBy(w => w.CreatedAt).Select(w => w.Id).FirstOrDefault();
        return Ok(new UserDto(user.Id, user.Email, user.DisplayName, user.PreferredLanguage, user.DailyGoalPoints, defaultWorkspaceId));
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var user = await db.Users
            .Include(u => u.Workspaces)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null)
        {
            return Unauthorized();
        }

        user.DisplayName = request.DisplayName.Trim();
        user.PreferredLanguage = string.IsNullOrWhiteSpace(request.PreferredLanguage) ? "ar" : request.PreferredLanguage.Trim();
        user.DailyGoalPoints = Math.Clamp(request.DailyGoalPoints, 2, 50);
        await db.SaveChangesAsync(ct);

        var defaultWorkspaceId = user.Workspaces.OrderBy(w => w.CreatedAt).Select(w => w.Id).FirstOrDefault();
        return Ok(new UserDto(user.Id, user.Email, user.DisplayName, user.PreferredLanguage, user.DailyGoalPoints, defaultWorkspaceId));
    }
}
