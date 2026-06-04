const { extractStreams } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        console.log("Step 1: Starting getStreams");
        const results = await extractStreams("naruto", episode);
        console.log("Step 2: Scraper finished, returning results");
        return results;
    } catch (error) {
        console.log("Step 3: Fatal Error caught:", error.message);
        return [];
    }
}

// Ensure Nuvio can see the function
global.getStreams = getStreams;
module.exports = { getStreams };