using StudyApp.Api.Domain.Entities;

namespace StudyApp.Api.Services;

public interface ITokenService
{
    (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(User user);
}
