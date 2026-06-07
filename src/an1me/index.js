const { extractStreams, searchAnimeSlug } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode, extra) {
    try {
        // 1. Core Map Dictionary Mapping
        const slugMap = {
            "65123": "rezero-kara-hajimeru-isekai-seikatsu", // Re:Zero
            "1429": "shingeki-no-kyojin",                   // Attack on Titan
            "2150": "naruto",                               // Naruto
            "31911": "fullmetal-alchemist-brotherhood"      // Fullmetal Alchemist: B
        };

        let targetId = "";
        if (tmdbId !== null && tmdbId !== undefined) {
            targetId = String(tmdbId).trim().split('.')[0];
        }

        console.log(`[An1me Provider] Received TMDB ID: "${targetId}"`);

        let slug = null;

        if (targetId && slugMap[targetId]) {
            slug = slugMap[targetId];
            console.log(`[An1me Provider] Dictionary HIT! Using slug: "${slug}"`);
        } else {
            console.log(`[An1me Provider] Dictionary MISS for ID "${targetId}". Running fallback search...`);
            slug = await searchAnimeSlug(extra || tmdbId);
        }

        if (!slug) return [];

        const streams = await extractStreams(slug, episode);

        // 2. Fortified Output Formatter
        const results = [];

        for (const stream of streams) {
            let finalizedUrl = stream.url;

            // Already a clean playable URL (.m3u8 or .mp4) — keep as-is
            if (finalizedUrl.includes('.m3u8') || finalizedUrl.includes('.mp4')) {
                console.log(`[An1me Provider] Clean stream URL, keeping as-is: ${finalizedUrl}`);
                results.push({ ...stream, url: finalizedUrl });
                continue;
            }

            // Direct googleusercontent CDN link — these ARE the video files.
            // Do NOT append anything; just use the URL directly.
            if (finalizedUrl.includes('googleusercontent.com')) {
                console.log(`[An1me Provider] Direct Google CDN stream, using as-is: ${finalizedUrl}`);
                results.push({ ...stream, url: finalizedUrl });
                continue;
            }

            // Unresolved Google Photos share link — the extractor failed to
            // resolve it to a direct CDN URL. These are NOT playable, so skip.
            if (finalizedUrl.includes('photos.google.com') || finalizedUrl.includes('googlevideo.com')) {
                console.log(`[An1me Provider] Skipping unresolved Google Photos URL (not playable): ${finalizedUrl}`);
                continue;
            }

            // Generic unknown URL — try appending ext hint as a last resort
            finalizedUrl += finalizedUrl.includes('?') ? '&ext=.mp4' : '?ext=.mp4';
            console.log(`[An1me Provider] Unknown URL format, appending ext hint: ${finalizedUrl}`);
            results.push({ ...stream, url: finalizedUrl });
        }

        console.log(`[An1me Provider] Returning ${results.length} playable stream(s).`);
        return results;

    } catch (err) {
        console.log(`[An1me Index Exception] Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };

if (typeof global !== 'undefined') global.getStreams = getStreams;
if (typeof window !== 'undefined') window.getStreams = getStreams;