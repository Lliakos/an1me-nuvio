const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

async function extractStreams(title, episode) {
    const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const streams = [];

    $('[data-embed-id]').each((i, el) => {
        const data = $(el).attr('data-embed-id');
        const [name, iframe] = data.split(':');
        const urlMatch = atob(iframe).match(/src="([^"]+)"/);
        
        if (urlMatch) {
            streams.push({
                name: "An1me",
                title: atob(name),
                url: urlMatch[1],
                headers: HEADERS
            });
        }
    });
    return streams;
}

module.exports = { extractStreams };