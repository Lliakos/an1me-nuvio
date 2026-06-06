const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

// A safe cross-platform base64 decoder compatible with Nuvio's mobile runtime engine
function safeAtob(input) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';
    if (str.length % 4 === 1) return '';
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

// Extract deep links from Google Photos pages by targeting the raw video stream configuration
function extractGooglePhotosMp4(googlePhotosUrl) {
    return fetchText(googlePhotosUrl)
        .then(html => {
            const videoMatch = html.match(/(https:\/\/[^\s"']+\.googlevideo\.com\/videoplayback[^\s"']+)/);
            if (videoMatch) {
                // Google escapes query parameters in their script blocks; unescape them for standard players
                return videoMatch[1].replace(/\\u0026/g, '&');
            }
            return googlePhotosUrl;
        })
        .catch(() => googlePhotosUrl);
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
                            const decodedLink = safeAtob(krVideoMatch[1]);
                            
                            // Loose matching condition ensuring compatibility with all googleusercontent sub-URLs
                            if (decodedLink.includes('googleusercontent.com') || decodedLink.includes('photos.google.com')) {
                                console.log(`[Extractor] Fetching nested video stream for: ${serverName}`);
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
                                // Direct static server route (e.g., .m3u8 playlists from an1 CDN)
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