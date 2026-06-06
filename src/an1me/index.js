// src/an1me/index.js
const { extractStreams } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // Ensure you map tmdbId to the correct title format here for production
        return await extractStreams("naruto", episode);
    } catch (error) {
        console.error(error);
        return [];
    }
}

module.exports = { getStreams };