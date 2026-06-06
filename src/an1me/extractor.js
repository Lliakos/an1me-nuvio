const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

// Custom safe base64 decoder compatible with Nuvio's internal engine
function safeAtob(input) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';

    if (str.length % 4 === 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }

    for (let bc = 0, bs = 0, idx = 0; idx < str.length; idx++) {
        const char = str.charAt(idx);
        const p = chars.indexOf(char);
        if (p === -1) continue;

        bs = bc % 4 ? bs * 64 + p : p;
        if (bc++ % 4) {
            output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
    }
    return output;
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
            
            const serverName = safeAtob(nameB64).trim();
            const decodedIframe = safeAtob(iframeB64);
            const urlMatch = decodedIframe.match(/src="([^"]+)"/);
            
            if (urlMatch) {
                const embedUrl = urlMatch[1]; 
                const krVideoMatch = embedUrl.match(/kr-video\/([^?]+)/);
                
                let finalPlayableUrl = embedUrl;

                if (krVideoMatch) {
                    const decodedLink = safeAtob(krVideoMatch[1]);
                    
                    if (decodedLink.includes('photos.google.com')) {
                        console.log(`[${serverName}] Found Google Photos link, scraping...`);
                        finalPlayableUrl = await extractGooglePhotosMp4(decodedLink);
                    } else if (decodedLink.includes('.m3u8') || decodedLink.includes('.mp4')) {
                        console.log(`[${serverName}] Found direct stream link.`);
                        finalPlayableUrl = decodedLink;
                    } else {
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