using System.ComponentModel.DataAnnotations;

namespace StudyApp.Api.Contracts;

public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(2), MaxLength(160)] string DisplayName,
    [Required, MinLength(6), MaxLength(128)] string Password,
    string PreferredLanguage = "ar");

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public sealed record UserDto(
    Guid Id,
    string Email,
    string DisplayName,
    string PreferredLanguage,
    Guid DefaultWorkspaceId);

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    UserDto User);
