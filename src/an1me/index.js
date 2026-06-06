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
    // 1. Prioritize Nuvio's metadata, fallback to hardcoded map only if necessary
    const defaults = {
        "2150": "naruto",
        "46260": "naruto",
        "1429": "shingeki-no-kyojin",
        "31911": "fullmetal-alchemist-brotherhood",
        "65123": "rezero-kara-hajimeru-isekai-seikatsu"
    };

    const title = extra?.title || extra?.name || extra?.originalTitle || defaults[tmdbId];

    // If we have no title, stop here. 
    // If Re:Zero still doesn't show, it means Nuvio is providing NO title info for it.
    if (!title) {
        return Promise.resolve([]);
    }

    return extractStreams(slugify(title), episode).then(streams => {
        // Return mapped streams with forced extension
        return streams.map(stream => {
            let url = stream.url;
            if (!url.includes('.m3u8') && !url.includes('.mp4')) {
                url += url.includes('?') ? '&ext=.mp4' : '?ext=.mp4';
            }
            return { ...stream, url };
        });
    });
}

module.exports = { getStreams };

// Global context support
if (typeof global !== 'undefined') global.getStreams = getStreams;
if (typeof window !== 'undefined') window.getStreams = getStreams;