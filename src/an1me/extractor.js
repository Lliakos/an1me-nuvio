const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

async function extractStreams(tmdbId, mediaType, season, episode) {
    // 1. Logic to get the title slug (replace this if you have a specific TMDB-to-Slug mapper)
    const title = "naruto"; // You can replace this with dynamic TMDB lookup logic
    const url = `https://an1me.to/watch/${title}-episode-${episode}/`;

    // 2. Fetch the page
    const html = await fetchText(url);

    // 3. Parse
    const $ = cheerio.load(html);
    const streams = [];

    $('[data-embed-id]').each((i, el) => {
        try {
            const data = $(el).attr('data-embed-id');
            const parts = data.split(':');
            
            // atob is a global function, works everywhere
            const serverName = atob(parts[0]);
            const iframeHtml = atob(parts[1]);
            
            const urlMatch = iframeHtml.match(/src="([^"]+)"/);
            if (urlMatch) {
                streams.push({
                    name: "An1me",
                    title: serverName,
                    url: urlMatch[1].replace(/&amp;/g, '&'),
                    quality: "1080p",
                    headers: HEADERS
                });
            }
        } catch (e) {
            // Silently skip broken elements
        }
    });

    return streams;
}

module.exports = { extractStreams };