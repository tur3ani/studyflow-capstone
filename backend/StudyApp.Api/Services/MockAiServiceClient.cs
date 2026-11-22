using System.Text;
using System.Text.RegularExpressions;
using StudyApp.Api.Contracts;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace StudyApp.Api.Services;

/// <summary>
/// Local development mock for the Python AI service.
/// Uses PdfPig to perform real PDF page/paragraph extraction and returns structured bilingual explanations
/// so frontend, C# API, and PostgreSQL flows can be tested end-to-end before the Python service is running.
/// </summary>
public sealed partial class MockAiServiceClient : IAiServiceClient
{
    public string ProviderMode => "mock";

    public Task<PythonExtractResponse> ExtractDocumentAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        Guid documentId,
        CancellationToken ct)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext is ".txt" or ".md")
        {
            using var reader = new StreamReader(fileStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
            var text = reader.ReadToEnd();
            var textChunks = SplitPageIntoChunks(text, pageNumber: 1, startingIndex: 1);
            return Task.FromResult(new PythonExtractResponse(1, textChunks));
        }

        using var ms = new MemoryStream();
        fileStream.CopyTo(ms);
        ms.Position = 0;

        var chunks = new List<ExtractedChunkPayload>();
        var chunkIndex = 1;
        int pageCount;

        using (var pdf = PdfDocument.Open(ms))
        {
            pageCount = pdf.NumberOfPages;
            for (var p = 1; p <= pageCount; p++)
            {
                ct.ThrowIfCancellationRequested();
                var page = pdf.GetPage(p);
                var rawText = (ContentOrderTextExtractor.GetText(page) ?? string.Empty)
                    .Replace("\0", string.Empty)
                    .Trim();

                if (string.IsNullOrWhiteSpace(rawText))
                {
                    chunks.Add(new ExtractedChunkPayload(
                        ChunkIndex: chunkIndex++,
                        PageNumber: p,
                        Heading: $"Page {p} (Scanned / Image Page)",
                        Content: $"[No embedded text was detected on page {p}. When connected to the Python AI service, OCR will extract text from this scanned page.]",
                        CharStart: 0,
                        CharEnd: 0,
                        NeedsOcr: true));
                    continue;
                }

                var pageChunks = SplitPageIntoChunks(rawText, p, chunkIndex);
                chunks.AddRange(pageChunks);
                chunkIndex += pageChunks.Count;
            }
        }

        if (chunks.Count == 0)
        {
            chunks.Add(new ExtractedChunkPayload(
                ChunkIndex: 1,
                PageNumber: 1,
                Heading: Path.GetFileNameWithoutExtension(fileName),
                Content: "[Document contained no extractable text.]",
                CharStart: 0,
                CharEnd: 0,
                NeedsOcr: true));
            pageCount = Math.Max(1, pageCount);
        }

        return Task.FromResult(new PythonExtractResponse(pageCount, chunks));
    }

    public Task<PythonExplainChunkResponse> ExplainChunkAsync(
        PythonExplainChunkRequest request,
        CancellationToken ct)
    {
        var terms = ExtractCandidateTechnicalTerms(request.PassageText, request.SelectedTerm);
        var primaryTerm = !string.IsNullOrWhiteSpace(request.SelectedTerm)
            ? request.SelectedTerm.Trim()
            : (terms.FirstOrDefault() ?? request.Heading ?? "Concept");

        var isArabic = !string.Equals(request.TargetLanguage, "en", StringComparison.OrdinalIgnoreCase);
        var headingLabel = string.IsNullOrWhiteSpace(request.Heading)
            ? $"صفحة {request.PageNumber}"
            : request.Heading;

        string explanation;
        string suggestedTitle;

        if (isArabic)
        {
            var termsLine = terms.Count > 0
                ? string.Join("، ", terms.Select(t => $"`{t}`"))
                : $"`{primaryTerm}`";

            var previewSnippet = Truncate(request.PassageText, 190);
            var modeHeader = request.Mode switch
            {
                "explain_term" => $"**تعريف المصطلح (`{primaryTerm}`):**",
                "story_mode" => "**ملخص سطر واحد (Story Mode Draft):**",
                "example" => "**شرح مع مثال تطبيقي:**",
                _ => "**الشرح المبسط للفقرة:**"
            };

            explanation =
                $"""
                {modeHeader}
                تتناول هذه الفقرة من **{headingLabel}** (الصفحة {request.PageNumber}) مفهوم **{primaryTerm}** بشكل مباشر ومرتبط بسياق المحاضرة.

                - **الفكرة الأساسية:** يوضح النص المصدري كيف يعمل المفهوم ولماذا يُستخدم عملياً مع الحفاظ على المصطلحات التقنية بالإنجليزية: {termsLine}.
                - **الربط بالنص الأصلي:** "{previewSnippet}"
                - **نقطة للمراجعة:** تأكد عند المذاكرة من قدرتك على شرح **{primaryTerm}** بأسلوبك الخاص وذكر حالتين أو جانبيْن للمفهوم (مثل التوسع والتقليص أو المزايا والقيود إن وُجدت في النص).

                > *(وضع المحاكاة المحلي Mock AI Mode — عند تشغيل خدمة Python FastAPI سيُولَّد هذا الشرح مباشرة من النموذج اللغوي Gemini مع التحقق من المرجع.)*
                """;

            suggestedTitle = $"{primaryTerm} — شرح (ص {request.PageNumber})";
        }
        else
        {
            var termsLine = terms.Count > 0
                ? string.Join(", ", terms.Select(t => $"`{t}`"))
                : $"`{primaryTerm}`";

            explanation =
                $"""
                **Concept Explanation (`{primaryTerm}` — Page {request.PageNumber}):**
                This passage under **{request.Heading ?? $"Page {request.PageNumber}"}** introduces **{primaryTerm}** and connects it to the surrounding lecture topic.

                - **Key terms preserved:** {termsLine}
                - **Core takeaway:** Focus on the mechanism, cause-and-effect relationship, and practical boundary conditions described in this paragraph.
                - **Active recall check:** Try restating this passage in one sentence without looking back at page {request.PageNumber}.

                > *(Local Mock AI Mode — switch `AiService:UseMock` to `false` in `appsettings.Development.json` once the Python FastAPI service is running.)*
                """;

            suggestedTitle = $"{primaryTerm} — Notes (p. {request.PageNumber})";
        }

        return Task.FromResult(new PythonExplainChunkResponse(
            Explanation: explanation,
            KeyTerms: terms,
            SuggestedNoteTitle: suggestedTitle,
            SourcePageNumber: request.PageNumber));
    }

    private static List<ExtractedChunkPayload> SplitPageIntoChunks(string rawText, int pageNumber, int startingIndex)
    {
        var normalized = rawText.Replace("\r\n", "\n").Replace('\r', '\n');
        var rawBlocks = MultiNewlineRegex().Split(normalized)
            .Select(b => WhitespaceCleanupRegex().Replace(b.Trim(), " "))
            .Where(b => !string.IsNullOrWhiteSpace(b))
            .ToList();

        // If the PDF text had single newlines only, split by line groups / sentences into ~600-char chunks.
        if (rawBlocks.Count == 1 && rawBlocks[0].Length > 750)
        {
            rawBlocks = SplitLongBlock(normalized, maxLength: 650);
        }

        var results = new List<ExtractedChunkPayload>();
        string? currentHeading = null;
        var currentIndex = startingIndex;
        var cursor = 0;

        foreach (var block in rawBlocks)
        {
            // Short title-like line becomes the heading for the following passage.
            if (block.Length <= 80 && !block.EndsWith('.') && !block.EndsWith('?') && rawBlocks.Count > 1)
            {
                currentHeading = block;
                cursor += block.Length + 1;
                continue;
            }

            if (block.Length < 25 && results.Count > 0)
            {
                // Merge tiny trailing fragments into previous chunk
                var prev = results[^1];
                var merged = $"{prev.Content}\n{block}";
                results[^1] = prev with { Content = merged, CharEnd = prev.CharStart + merged.Length };
                cursor += block.Length + 1;
                continue;
            }

            var start = cursor;
            var end = start + block.Length;
            cursor = end + 1;

            results.Add(new ExtractedChunkPayload(
                ChunkIndex: currentIndex++,
                PageNumber: pageNumber,
                Heading: currentHeading ?? $"Page {pageNumber} · Passage {results.Count + 1}",
                Content: block,
                CharStart: start,
                CharEnd: end,
                NeedsOcr: false));
        }

        if (results.Count == 0 && !string.IsNullOrWhiteSpace(currentHeading))
        {
            results.Add(new ExtractedChunkPayload(
                ChunkIndex: currentIndex,
                PageNumber: pageNumber,
                Heading: currentHeading,
                Content: currentHeading,
                CharStart: 0,
                CharEnd: currentHeading.Length,
                NeedsOcr: false));
        }

        return results;
    }

    private static List<string> SplitLongBlock(string text, int maxLength)
    {
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var chunks = new List<string>();
        var sb = new StringBuilder();

        foreach (var line in lines)
        {
            if (sb.Length > 0 && sb.Length + line.Length + 1 > maxLength)
            {
                chunks.Add(sb.ToString().Trim());
                sb.Clear();
            }

            if (sb.Length > 0)
            {
                sb.Append(' ');
            }

            sb.Append(line);
        }

        if (sb.Length > 0)
        {
            chunks.Add(sb.ToString().Trim());
        }

        return chunks;
    }

    private static List<string> ExtractCandidateTechnicalTerms(string text, string? selectedTerm)
    {
        var results = new List<string>();
        if (!string.IsNullOrWhiteSpace(selectedTerm))
        {
            results.Add(selectedTerm.Trim());
        }

        var matches = EnglishTermRegex().Matches(text);
        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "The", "This", "That", "With", "From", "Into", "When", "Where", "What", "Which",
            "Page", "Chapter", "Lecture", "Figure", "Table", "Section", "Example", "Because",
            "However", "Therefore", "These", "Those", "Their", "There", "About", "After", "Before"
        };

        foreach (Match match in matches)
        {
            var term = match.Value.Trim();
            if (term.Length < 4 || stopWords.Contains(term))
            {
                continue;
            }

            if (!results.Contains(term, StringComparer.OrdinalIgnoreCase))
            {
                results.Add(term);
            }

            if (results.Count >= 5)
            {
                break;
            }
        }

        return results;
    }

    private static string Truncate(string value, int maxLength)
    {
        if (value.Length <= maxLength)
        {
            return value;
        }

        return value[..maxLength].TrimEnd() + "...";
    }

    [GeneratedRegex(@"\n\s*\n+")]
    private static partial Regex MultiNewlineRegex();

    [GeneratedRegex(@"[ \t]+")]
    private static partial Regex WhitespaceCleanupRegex();

    [GeneratedRegex(@"\b(?:[A-Z]{2,}|[A-Z][a-z]+(?:[A-Z][a-z]+)*|[a-zA-Z]+-[a-zA-Z]+)\b")]
    private static partial Regex EnglishTermRegex();
}
