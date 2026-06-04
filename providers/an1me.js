/**
 * an1me.to — Nuvio Provider (Production Version)
 */
"use strict";

function getStreams(tmdbId, mediaType, season, episode) {
    // 1. Get Title from TMDB
    return fetch("https://api.themoviedb.org/3/" + mediaType + "/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96")
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var title = (data.name || data.title).toLowerCase().replace(/[^a-z0-9]/g, "-");
            // Constructing the watch URL
            return "https://an1me.to/watch/" + title + "-episode-" + episode + "/";
        })
        .then(function(url) {
            // 2. Fetch the watch page
            return fetch(url, { headers: { "Referer": "https://an1me.to/" } })
                .then(function(res) { return res.text(); });
        })
        .then(function(html) {
            // 3. Extract all data-embed-id attributes
            var streams = [];
            var regex = /data-embed-id="([^"]+)"/g;
            var match;
            
            while ((match = regex.exec(html)) !== null) {
                try {
                    var parts = match[1].split(':');
                    if (parts.length < 2) continue;
                    
                    var serverName = atob(parts[0]);
                    var iframeHtml = atob(parts[1]);
                    
                    // Extract the kr-video URL from the decoded iframe HTML
                    var urlMatch = iframeHtml.match(/src="([^"]+)"/);
                    if (urlMatch) {
                        var videoUrl = urlMatch[1].replace(/&amp;/g, '&');
                        streams.push({
                            title: serverName,
                            url: videoUrl,
                            headers: { "Referer": "https://an1me.to/", "Origin": "https://an1me.to" }
                        });
                    }
                } catch (e) {
                    continue;
                }
            }
            return streams;
        })
        .catch(function(err) {
            console.error("Provider Error:", err);
            return [];
        });
}

module.exports = { getStreams: getStreams };