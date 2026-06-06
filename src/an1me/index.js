const { extractStreams } = require('./extractor.js');

function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')          
        .replace(/[^\w\-]+/g, '')      
        .replace(/\-\-+/g, '-');       
}

function getStreams(tmdbId, mediaType, season, episode, extra) {
    // Dynamic mapping table based on what you select
    const defaults = {
        "2150": "naruto",
        "46260": "naruto",
        "1429": "shingeki-no-kyojin",
        "31911": "fullmetal-alchemist-brotherhood"
    };

    const title = extra?.title || extra?.name || extra?.originalTitle || defaults[tmdbId];

    if (!title) {
        console.log(`[Index] No valid title found for TMDB ID: ${tmdbId}`);
        return Promise.resolve([]);
    }

    const slug = slugify(title);
    return extractStreams(slug, episode);
}

module.exports = { getStreams };