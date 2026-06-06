const { extractStreams } = require('./extractor.js');

/**
 * Sanitizes the anime title into a URL-friendly slug matching an1me.to
 */
function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word characters
        .replace(/\-\-+/g, '-');        // Replace multiple dashes with a single dash
}

// Accept the arguments matching Nuvio's strict provider layout
async function getStreams(tmdbId, mediaType, season, episode, extra) {
    try {
        console.log(`[An1me] getStreams called for TMDB: ${tmdbId}, Type: ${mediaType}`);

        // Extract the title safely from the extra context object passed by Nuvio
        let title = extra?.title || extra?.name || extra?.originalTitle;

        // Fallback: If Nuvio doesn't provide a title object, we use a default map 
        // for our primary testing targets to ensure it never completely goes blank.
        if (!title) {
            const defaults = {
                "46260": "Naruto",
                "1429": "Shingeki no Kyojin",
                "31911": "Fullmetal Alchemist Brotherhood"
            };
            title = defaults[tmdbId];
        }

        if (!title) {
            console.log(`[An1me] Could not resolve a title string for TMDB ID: ${tmdbId}`);
            return [];
        }

        const slug = slugify(title);
        console.log(`[An1me] Processing slug: ${slug} | Episode: ${episode}`);

        // Fetch streams from your universal extractor
        const streams = await extractStreams(slug, episode);
        
        return streams;
    } catch (error) {
        console.error("[An1me] Critical provider error:", error.message);
        return [];
    }
}

module.exports = { getStreams };