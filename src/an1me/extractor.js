const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

function decodeBase64(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

async function extractGooglePhotosMp4(googlePhotosUrl) {
    try {
        console.log(`Extracting MP4 from Google Photos...`);
        const html = await fetchText(googlePhotosUrl);
        
        const videoMatch = html.match(/(https:\/\/[^\s"']+\.googlevideo\.com\/videoplayback[^\s"']+)/);
        
        if (videoMatch) {
            const cleanUrl = videoMatch[1].replace(/\\u0026/g, '&');
            return cleanUrl;
        }
        return googlePhotosUrl; 
    } catch (e) {
        console.log("Failed to extract Google Photos MP4:", e.message);
        return googlePhotosUrl;
    }
}

async function extractStreams(title, episode) {
    const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const streams = [];

    console.log(`Searching for embeds on: ${url}`);
    
    const embedElements = $('[data-embed-id]').toArray();

    for (const el of embedElements) {
        try {
            const data = $(el).attr('data-embed-id');
            const [nameB64, iframeB64] = data.split(':');
            
            const serverName = decodeBase64(nameB64).trim();
            const decodedIframe = decodeBase64(iframeB64);
            const urlMatch = decodedIframe.match(/src="([^"]+)"/);
            
            if (urlMatch) {
                const embedUrl = urlMatch[1]; 
                const krVideoMatch = embedUrl.match(/kr-video\/([^?]+)/);
                
                let finalPlayableUrl = embedUrl;

                if (krVideoMatch) {
                    // 1. Decode the hidden link
                    const decodedLink = decodeBase64(krVideoMatch[1]);
                    
                    // 2. ROUTING LOGIC: Determine what type of link we found
                    if (decodedLink.includes('photos.google.com')) {
                        // It's Google Photos, we must scrape it further
                        console.log(`[${serverName}] Found Google Photos link, scraping...`);
                        finalPlayableUrl = await extractGooglePhotosMp4(decodedLink);
                        
                    } else if (decodedLink.includes('.m3u8') || decodedLink.includes('.mp4')) {
                        // It's a direct CDN stream (like An1 Server), pass it straight through
                        console.log(`[${serverName}] Found direct stream link.`);
                        finalPlayableUrl = decodedLink;
                        
                    } else {
                        // Fallback for unknown link types
                        console.log(`[${serverName}] Found unknown link type.`);
                        finalPlayableUrl = decodedLink;
                    }
                }
                
                streams.push({
                    name: "An1me",
                    title: serverName, 
                    url: finalPlayableUrl,
                    headers: HEADERS
                });
            }
        } catch (e) {
            console.log("Error parsing embed:", e.message);
        }
    }

    console.log(`Found ${streams.length} playable streams.`);
    return streams;
}

module.exports = { extractStreams };