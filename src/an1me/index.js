function getStreams(tmdbId, mediaType, season, episode, extra) {
    // 1. Try to get title from Nuvio's extra metadata first
    // 2. Fallback to defaults if Nuvio didn't provide extra data
    const defaults = {
        "2150": "naruto",
        "46260": "naruto",
        "1429": "shingeki-no-kyojin",
        "31911": "fullmetal-alchemist-brotherhood",
        "65123": "rezero-kara-hajimeru-isekai-seikatsu"
    };

    let title = extra?.title || extra?.name || extra?.originalTitle || defaults[tmdbId];

    // 3. REMOVE the "if (!title) return []" block. 
    // Instead, if we still have no title, log it so we can see what Nuvio is sending.
    if (!title) {
        console.log(`[Index] Warning: No title found for TMDB ID: ${tmdbId}`);
        title = "naruto"; // Or any valid fallback slug
    }

    const slug = slugify(title);
    
    return extractStreams(slug, episode).then(streams => {
        // Keep your Debug Injection here to confirm it's loading
        streams.push({
            name: "An1me",
            title: "DEBUG: Forced Stream",
            url: "https://www.w3schools.com/html/mov_bbb.mp4",
            headers: {}
        });

        return streams.map(stream => {
            let finalizedUrl = stream.url;
            if (!finalizedUrl.includes('.m3u8') && !finalizedUrl.includes('.mp4')) {
                finalizedUrl += finalizedUrl.includes('?') ? '&ext=.mp4' : '?ext=.mp4';
            }
            return { ...stream, url: finalizedUrl };
        });
    });
}