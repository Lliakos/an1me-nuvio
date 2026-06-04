/**
 * an1me.to — Nuvio Provider (Safe Mode)
 */
"use strict";

function getStreams(tmdbId, mediaType, season, episode) {
    // Return a hardcoded "Debug" stream to verify the pipe is working
    // If this shows up, we know the issue is the scraping/atob logic.
    return Promise.resolve([{
        title: "DEBUG: API Reached",
        url: "https://test-url.m3u8",
        headers: { "Referer": "https://an1me.to/" }
    }]);
}

module.exports = { getStreams: getStreams };