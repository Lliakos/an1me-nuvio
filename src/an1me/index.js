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

        // SAFETY CLEANSE: Convert tmdbId to a clean string, stripping any decimal fluff
        let targetId = "";
        if (tmdbId !== null && tmdbId !== undefined) {
            targetId = String(tmdbId).trim().split('.')[0];
        }

        console.log(`[An1me Provider] Received TMDB ID: "${targetId}" (Type: ${typeof tmdbId}), Season: ${season}, Episode: ${episode}`);

        let slug = null;

        // 2. Direct Dictionary Lookup
        if (targetId && slugMap[targetId]) {
            slug = slugMap[targetId];
            console.log(`[An1me Provider] Dictionary HIT! Using slug: "${slug}"`);
        } else {
            console.log(`[An1me Provider] Dictionary MISS for ID "${targetId}". Attempting dynamic search fallback...`);
            // Fallback dynamically if it's a new show not in the mapping dictionary
            slug = await searchAnimeSlug(extra || tmdbId || String(title));
        }
        
        if (!slug) {
            console.log(`[An1me Provider] Critical Error: Unable to resolve a slug candidate.`);
            return [];
        }

        // 3. Extract media streams
        const streams = await extractStreams(slug, episode);
        console.log(`[An1me Provider] Extraction finished. Found ${streams.length} stream entries.`);
        
        // 4. Standardize output format for Nuvio
        return streams.map(stream => {
            let finalizedUrl = stream.url;
            
            if (!finalizedUrl.includes('.m3u8') && !finalizedUrl.includes('.mp4')) {
                finalizedUrl += finalizedUrl.includes('?') ? '&ext=.mp4' : '?ext=.mp4';
            }

            return {
                ...stream,
                url: finalizedUrl
            };
        });
    } catch (err) {
        console.log(`[An1me Index Exception] Error executing stream extraction: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };

// Context support for Nuvio native environments
if (typeof global !== 'undefined') global.getStreams = getStreams;
if (typeof window !== 'undefined') window.getStreams = getStreams;