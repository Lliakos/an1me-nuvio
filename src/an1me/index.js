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
    // 1. Prioritize Nuvio's metadata
    // We remove the hardcoded 'defaults' map to make it universal
    const title = extra?.title || extra?.name || extra?.originalTitle;

    // 2. If Nuvio sends no title, we return an empty array
    if (!title) {
        return Promise.resolve([]);
    }

    const slug = slugify(title);
    
    // 3. Search for the stream using the title directly from the app
    return extractStreams(slug, episode).then(streams => {
        return streams.map(stream => {
            let finalizedUrl = stream.url;
            
            // Standardize output format for Nuvio
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
if (typeof global !== 'undefined') global.getStreams = getStreams;
if (typeof window !== 'undefined') window.getStreams = getStreams;