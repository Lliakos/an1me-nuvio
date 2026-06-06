async function getStreams(tmdbId, mediaType, season, episode, extra) {
    try {
        console.log("[An1me Test] Provider function invoked successfully!");
        
        // Return a single hardcoded stream instantly to check UI visibility
        return [
            {
                name: "An1me Test Server",
                title: `Testing ID: ${tmdbId} | Ep: ${episode}`,
                url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            }
        ];
    } catch (error) {
        console.error("[An1me Test] Error:", error.message);
        return [];
    }
}

module.exports = { getStreams };