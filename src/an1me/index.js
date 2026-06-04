// index.js - The absolute minimum
async function getStreams(tmdbId, mediaType, season, episode) {
    return [{
        name: "An1me Test",
        title: "Working",
        url: "https://www.w3schools.com/html/mov_bbb.mp4",
        quality: "1080p",
        headers: {}
    }];
}

module.exports = { getStreams };