const { extractStreams, searchAnimeSlug } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode, extra) {
    try {
        const slugMap = {
            "65123": "rezero-kara-hajimeru-isekai-seikatsu", // Re:Zero
            "1429":  "shingeki-no-kyojin",                  // Attack on Titan
            "2150":  "naruto",                              // Naruto
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

        // extractor now returns only verified, playable streams (nulls already filtered)
        const streams = await extractStreams(slug, episode);
        console.log(`[An1me Provider] Returning ${streams.length} playable stream(s).`);
        return streams;

    } catch (err) {
        console.log(`[An1me Index Exception] Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };

if (typeof global !== 'undefined') global.getStreams = getStreams;
if (typeof window !== 'undefined') window.getStreams = getStreams;