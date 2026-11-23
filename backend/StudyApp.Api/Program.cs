using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using StudyApp.Api.Data;
using StudyApp.Api.Domain.Entities;
using StudyApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Database (PostgreSQL + EF Core / Npgsql)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. Authentication (JWT Bearer)
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSecret = jwtSection["Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"] ?? "StudyApp.Api",
            ValidAudience = jwtSection["Audience"] ?? "StudyApp.Client",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

// 3. Application Services
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();

// Switchable AI boundary: MockAiServiceClient for local dev vs HttpAiServiceClient for Python FastAPI
var useMockAi = builder.Configuration.GetValue("AiService:UseMock", true);
if (useMockAi)
{
    builder.Services.AddScoped<IAiServiceClient, MockAiServiceClient>();
}
else
{
    var aiBaseUrl = builder.Configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
    builder.Services.AddHttpClient<IAiServiceClient, HttpAiServiceClient>(client =>
    {
        client.BaseAddress = new Uri(aiBaseUrl);
        client.Timeout = TimeSpan.FromMinutes(2);
    });
}

// 4. CORS for React Vite frontend
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Ensure PostgreSQL schema is ready on startup in Development
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        if (db.Database.GetMigrations().Any())
        {
            await db.Database.MigrateAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }
        await db.Database.ExecuteSqlRawAsync(
            """ALTER TABLE users ADD COLUMN IF NOT EXISTS "DailyGoalPoints" integer NOT NULL DEFAULT 6;""");
        logger.LogInformation("PostgreSQL database schema is ready.");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Could not auto-initialize PostgreSQL on startup. Make sure Docker Postgres is running.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", async (AppDbContext db, IAiServiceClient aiClient, CancellationToken ct) =>
{
    var dbConnected = await db.Database.CanConnectAsync(ct);
    return Results.Ok(new
    {
        status = dbConnected ? "healthy" : "degraded",
        database = dbConnected ? "connected" : "unreachable",
        aiProviderMode = aiClient.ProviderMode,
        timestamp = DateTimeOffset.UtcNow
    });
});

app.MapControllers();

app.Run();
