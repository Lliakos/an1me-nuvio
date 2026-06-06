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
    // Standard backup maps if titles do not pass correctly through context attributes
    const defaults = {
        "46260": "Naruto",
        "1429": "Shingeki no Kyojin",
        "31911": "Fullmetal Alchemist Brotherhood"
    };

    const title = extra?.title || extra?.name || extra?.originalTitle || defaults[tmdbId];

    if (!title) {
        return Promise.resolve([]);
    }

    const slug = slugify(title);

    // Explicitly return the Promise resolution map to satisfy the plugin environment wrapper
    return extractStreams(slug, episode);
}

module.exports = { getStreams };