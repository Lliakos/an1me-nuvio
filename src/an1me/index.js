const { extractStreams } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode) {
    // Basic mapping logic
    const title = "naruto"; 
    return await extractStreams(title, episode);
}

module.exports = { getStreams };