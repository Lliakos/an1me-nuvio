const { extractStreams, searchAnimeSlug } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode, extra) {
    try {
        // 1. The Core Source of Truth Dictionary Mapping
        const slugMap = {
            "65123": "rezero-kara-hajimeru-isekai-seikatsu", // Re:Zero
            "1429": "shingeki-no-kyojin",                   // Attack on Titan
            "2150": "naruto",                               // Naruto
            "31911": "fullmetal-alchemist-brotherhood"      // Fullmetal Alchemist: B
        };

        let slug = null;
        const targetId = String(tmdbId);

        // 2. Check if we have an explicit hardcoded mapping first
        if (slugMap[targetId]) {
            slug = slugMap[targetId];
            console.log(`[Index] Match found in local dictionary mapping: ${slug}`);
        } else {
            // Fallback dynamically to the extraction scanner if it's a completely new show
            slug = await searchAnimeSlug(extra || tmdbId);
        }
        
        if (!slug) return [];

        // 3. Extract media streams
        const streams = await extractStreams(slug, episode);
        
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
        console.log(`[Index] Error executing stream extraction: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };

// Context support for Nuvio environment
if (typeof global !== 'undefined') global.getStreams = getStreams;
if (typeof window !== 'undefined') window.getStreams = getStreams;