const { extractStreams } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        return await extractStreams(tmdbId, mediaType, season, episode);
    } catch (error) {
        console.error("Provider Error:", error.message);
        return [];
    }
}

module.exports = { getStreams };