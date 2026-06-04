const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

async function extractStreams(title, episode) {
    const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const streams = [];

    // Log if we found anything at all
    console.log("Searching for embeds...");
    
    $('[data-embed-id]').each((i, el) => {
        try {
            const data = $(el).attr('data-embed-id');
            const [name, iframe] = data.split(':');
            
            // Use atob safely
            const decodedIframe = atob(iframe);
            const urlMatch = decodedIframe.match(/src="([^"]+)"/);
            
            if (urlMatch) {
                streams.push({
                    name: "An1me",
                    title: atob(name),
                    url: urlMatch[1],
                    headers: HEADERS
                });
            }
        } catch (e) {
            console.log("Error parsing embed:", e.message);
        }
    });

    console.log(`Found ${streams.length} streams.`);
    return streams;
}

module.exports = { extractStreams };