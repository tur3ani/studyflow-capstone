using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace StudyApp.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (Guid.TryParse(raw, out var id))
        {
            return id;
        }

        throw new UnauthorizedAccessException("Authenticated user ID claim is missing.");
    }
}
