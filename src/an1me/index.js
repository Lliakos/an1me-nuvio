const { extractStreams, searchAnimeSlug } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode, extra) {
    // 1. Prioritize Nuvio's metadata
    const title = extra?.title || extra?.name || extra?.originalTitle;

    // 2. If Nuvio sends no title, we return an empty array
    if (!title) {
        return [];
    }

    // 3. Search an1me.to dynamically to grab the REAL slug
    const slug = await searchAnimeSlug(title);
    
    // 4. Extract streams using the verified slug
    const streams = await extractStreams(slug, episode);
    
    // 5. Standardize output format for Nuvio
    return streams.map(stream => {
        let finalizedUrl = stream.url;
        
        if (!finalizedUrl.includes('.m3u8') && !finalizedUrl.includes('.mp4')) {
            finalizedUrl += finalizedUrl.includes('?') ? '&ext=.mp4' : '?ext=.mp4';
        }

        return {
            ...stream,
            url: finalizedUrl
        };
    });
}

module.exports = { getStreams };

// Context support for Nuvio environment
if (typeof global !== 'undefined') global.getStreams = getStreams;
if (typeof window !== 'undefined') window.getStreams = getStreams;