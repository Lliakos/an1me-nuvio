const { extractStreams } = require('./extractor.js');

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
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

    // If no title, we return an empty array, but we ensure it is a valid Promise
    if (!title) return Promise.resolve([]);

    return extractStreams(slugify(title), episode).then(streams => {
        return streams.map(stream => ({
            ...stream,
            url: stream.url.includes('?') ? stream.url + '&ext=.mp4' : stream.url + '?ext=.mp4'
        }));
    });
}

module.exports = { getStreams };