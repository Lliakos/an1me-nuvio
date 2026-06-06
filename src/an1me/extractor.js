const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

// Helper function for clean decoding
function decodeBase64(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

async function extractStreams(title, episode) {
    const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const streams = [];

    console.log(`Searching for embeds on: ${url}`);
    
    $('[data-embed-id]').each((i, el) => {
        try {
            const data = $(el).attr('data-embed-id');
            const [nameB64, iframeB64] = data.split(':');
            
            // 1. Decode the first layer (Server Name and Iframe HTML)
            const serverName = decodeBase64(nameB64);
            const decodedIframe = decodeBase64(iframeB64);
            const urlMatch = decodedIframe.match(/src="([^"]+)"/);
            
            if (urlMatch) {
                const embedUrl = urlMatch[1]; 
                
                // 2. Look for the 'kr-video' pattern to find the second layer
                const krVideoMatch = embedUrl.match(/kr-video\/([^?]+)/);
                
                let finalUrl = embedUrl; // Default to the iframe URL if pattern fails

                if (krVideoMatch) {
                    // Decode the second layer to get the actual Google Photos / Video link
                    finalUrl = decodeBase64(krVideoMatch[1]);
                }
                
                streams.push({
                    name: "An1me",
                    title: serverName.trim(), // e.g., "Alpha Serversub"
                    url: finalUrl,
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