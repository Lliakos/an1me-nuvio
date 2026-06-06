const { extractStreams } = require('./extractor.js');

/**
 * Helper function to convert a standard title into a URL slug
 * Example: "Re:ZERO -Starting Life in Another World-" -> "rezero-kara-hajimeru-isekai-seikatsu"
 * (Note: If Greek titles are passed, we strip accents or rely on the media metadata fallback)
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

async function getStreams(tmdbId, mediaType, season, episode, metadata) {
    try {
        // Nuvio provides an object with the media's metadata, including the title
        const title = metadata?.title || metadata?.originalTitle;
        
        if (!title) {
            console.log(`Could not resolve a title for TMDB ID: ${tmdbId}`);
            return [];
        }

        console.log(`Nuvio requested: ${title} (TMDB ${tmdbId}), Episode ${episode}`);
        
        // 1. Dynamically turn the title into the slug format an1me.to uses
        const slug = slugify(title);
        
        console.log(`Generated search slug: ${slug}`);

        // 2. Pass the dynamic slug directly to the extractor
        return await extractStreams(slug, episode);
    } catch (error) {
        console.error("Provider error:", error.message);
        return [];
    }
}

module.exports = { getStreams };