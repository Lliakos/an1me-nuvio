const { extractStreams } = require('./extractor.js');

function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')          
        .replace(/[^\w\-]+/g, '')      
        .replace(/\-\-+/g, '-');       
}

function getStreams(tmdbId, mediaType, season, episode, extra) {
    const defaults = {
        "2150": "naruto",
        "46260": "naruto",
        "1429": "shingeki-no-kyojin",
        "31911": "fullmetal-alchemist-brotherhood",
        "65123": "rezero-kara-hajimeru-isekai-seikatsu"
    };

    const title = extra?.title || extra?.name || extra?.originalTitle || defaults[tmdbId];

    if (!title) {
        return Promise.resolve([]);
    }

    const slug = slugify(title);
    
    return extractStreams(slug, episode).then(streams => {
        // --- DEBUG INJECTION ---
        // If this appears in your app, your provider is successfully loading.
        streams.push({
            name: "An1me",
            title: "DEBUG: Forced Stream",
            url: "https://www.w3schools.com/html/mov_bbb.mp4",
            headers: {}
        });
        // -----------------------

        return streams.map(stream => {
            let finalizedUrl = stream.url;
            
            // Standardize output format
            if (!finalizedUrl.includes('.m3u8') && !finalizedUrl.includes('.mp4')) {
                finalizedUrl += finalizedUrl.includes('?') ? '&ext=.mp4' : '?ext=.mp4';
            }

            return {
                ...stream,
                url: finalizedUrl
            };
        });
    });
}

module.exports = { getStreams };

// Context support for Nuvio environment
if (typeof global !== 'undefined') { 
    global.getStreams = getStreams; 
}
if (typeof window !== 'undefined') { 
    window.getStreams = getStreams; 
}