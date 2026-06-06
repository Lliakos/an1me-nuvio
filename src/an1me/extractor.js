const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

// Standard cross-platform base64 decoder that runs identically in Node and Nuvio Hermes
function safeAtob(b64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = String(b64).replace(/=+$/, '');
    if (str.length % 4 === 1) return '';
    
    let bc = 0;
    let bs = 0;
    let idx = 0;
    let output = '';
    
    while (idx < str.length) {
        let char = str.charAt(idx++);
        let pos = chars.indexOf(char);
        if (pos === -1) continue;
        
        bs = bc % 4 ? bs * 64 + pos : pos;
        if (bc++ % 4) {
            output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
    }
    return output;
}

// Extract deep links from Google Photos pages by targeting the raw video stream configuration
function extractGooglePhotosMp4(googlePhotosUrl) {
    console.log(`[Extractor] Fetching actual Google Photos page: ${googlePhotosUrl}`);

    return fetchText(googlePhotosUrl)
        .then(html => {
            // Google heavily escapes URLs inside their JSON script variables.
            // We MUST unescape slashes, ampersands, and equals signs (\u003d / \x3d)
            const cleanHtml = html
                .replace(/\\\//g, '/')
                .replace(/\\u0026/g, '&')
                .replace(/\\u003d/g, '=')
                .replace(/\\x3d/g, '=')
                .replace(/\\x26/g, '&');
            
            // Priority 1: Standard Google Video Playback URLs
            const googleVideoMatch = cleanHtml.match(/(https:\/\/[^\s"'\\]+\.googlevideo\.com\/videoplayback[^\s"'\\]*)/i);
            if (googleVideoMatch) return googleVideoMatch[1];

            // Priority 2: Google Photos Video Stream markers (=m18, =m22, =m37)
            // This is the absolute most common format for Google Photos direct MP4 streams!
            const gPhotosQualityMatch = cleanHtml.match(/(https:\/\/[^\s"'\\]+\.googleusercontent\.com\/[^\s"'\\]+=m(?:18|22|37)[^\s"'\\]*)/i);
            if (gPhotosQualityMatch) return gPhotosQualityMatch[1];

            // Priority 3: Google Video Downloads endpoint
            const gDownloadMatch = cleanHtml.match(/(https:\/\/video-downloads\.googleusercontent\.com\/[^\s"'\\]+)/i);
            if (gDownloadMatch) return gDownloadMatch[1];

            // Priority 4: Standard mp4/m3u8 fallback
            const directMatch = cleanHtml.match(/(https?:\/\/[^\s"'\\]+\.(?:mp4|m3u8)[^\s"'\\]*)/i);
            if (directMatch) return directMatch[1];

            console.log("[Extractor] Warning: Regex failed to find a stream in the Google Photos HTML.");
            return googlePhotosUrl;
        })
        .catch(err => {
            console.log(`[Extractor] Fetch error on Google Photos: ${err.message}`);
            return googlePhotosUrl;
        });
}

function extractStreams(title, episode) {
    const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
    console.log(`[Extractor] Fetching page: ${url}`);
    
    return fetchText(url)
        .then(html => {
            const $ = cheerio.load(html);
            const promises = [];

            $('[data-embed-id]').each((i, el) => {
                try {
                    const data = $(el).attr('data-embed-id');
                    if (!data) return;
                    
                    const parts = data.split(':');
                    const serverName = safeAtob(parts[0]).trim();
                    const decodedIframe = safeAtob(parts[1]);
                    
                    const urlMatch = decodedIframe.match(/src="([^"]+)"/);
                    if (urlMatch) {
                        const embedUrl = urlMatch[1];
                        const krVideoMatch = embedUrl.match(/kr-video\/([^?]+)/);

                        if (krVideoMatch) {
                            let decodedLink = safeAtob(krVideoMatch[1]);
                            
                            // Check for ANY variant of Google Photos, Drive, or usercontent sharing formats
                            if (decodedLink.includes('photos.google.com') || decodedLink.includes('photos.app.goo.gl') || decodedLink.includes('googleusercontent.com')) {
                                console.log(`[Extractor] Detected Google Photos server data for: ${serverName}`);
                                
                                const p = extractGooglePhotosMp4(decodedLink).then(playableUrl => {
                                    return {
                                        name: "An1me",
                                        title: serverName,
                                        url: playableUrl,
                                        headers: HEADERS
                                    };
                                });
                                promises.push(p);
                            } else {
                                // Direct static stream track file format (e.g., standard .m3u8 URLs)
                                promises.push(Promise.resolve({
                                    name: "An1me",
                                    title: serverName,
                                    url: decodedLink,
                                    headers: HEADERS
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.log("[Extractor] Individual embed compilation error:", e.message);
                }
            });

            return Promise.all(promises);
        })
        .catch(err => {
            console.log(`[Extractor] Critical Network/HTTP Error: ${err.message}`);
            return [];
        });
}

module.exports = { extractStreams };