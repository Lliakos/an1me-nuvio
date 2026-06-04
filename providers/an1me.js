/**
 * an1me.to — Nuvio Provider (Testing Version)
 */
"use strict";

function getStreams(tmdbId, mediaType, season, episode) {
    // Return a dummy stream to test if the UI picks it up
    return Promise.resolve([{
        title: "Test Stream (Click Me)",
        url: "https://test-url.m3u8",
        headers: { "Referer": "https://an1me.to/" }
    }]);
}

module.exports = { getStreams: getStreams };