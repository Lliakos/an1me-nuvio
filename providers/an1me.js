/**
 * an1me.to — Nuvio Provider (Clean Version)
 */
"use strict";

function getStreams(tmdbId, mediaType, season, episode) {
    // 1. Logic to turn TMDB title into a slug
    // (This is a simplified example; ensure your slugify logic is robust)
    
    return fetch("https://api.themoviedb.org/3/" + mediaType + "/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96")
    .then(function(res) { return res.json(); })
    .then(function(data) {
        var title = (data.name || data.title).toLowerCase().replace(/[^a-z0-9]/g, "-");
        var watchUrl = "https://an1me.to/watch/" + title + "-episode-" + episode + "/";
        
        return fetch(watchUrl, {
            headers: { "Referer": "https://an1me.to/" }
        });
    })
    .then(function(res) { return res.text(); })
    .then(function(html) {
        // Logic to extract stream from HTML string
        // Only return an array of objects: { title: "Server Name", url: "..." }
        return []; 
    })
    .catch(function(err) {
        console.error("Provider Error:", err);
        return [];
    });
}

module.exports = { getStreams: getStreams };