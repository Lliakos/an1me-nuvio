const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

// Standard cross-platform base64 decoder
function safeAtob(b64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = String(b64).replace(/=+$/, '');
    if (str.length % 4 === 1) return '';
    
    let bc = 0, bs = 0, idx = 0, output = '';
    
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

// Extract deep links from Google Photos pages
function extractGooglePhotosMp4(googlePhotosUrl) {
    console.log(`[Extractor] Fetching actual Google Photos page: ${googlePhotosUrl}`);

    return fetchText(googlePhotosUrl)
        .then(html => {
            const cleanHtml = html
                .replace(/\\\//g, '/')
                .replace(/\\u0026/g, '&')
                .replace(/\\u003d/g, '=')
                .replace(/\\x3d/g, '=')
                .replace(/\\x26/g, '&');
            
            const googleVideoMatch = cleanHtml.match(/(https:\/\/[^\s"'\\]+\.googlevideo\.com\/videoplayback[^\s"'\\]*)/i);
            if (googleVideoMatch) return googleVideoMatch[1];

            const gPhotosQualityMatch = cleanHtml.match(/(https:\/\/[^\s"'\\]+\.googleusercontent\.com\/[^\s"'\\]+=m(?:18|22|37)[^\s"'\\]*)/i);
            if (gPhotosQualityMatch) return gPhotosQualityMatch[1];

            const gDownloadMatch = cleanHtml.match(/(https:\/\/video-downloads\.googleusercontent\.com\/[^\s"'\\]+)/i);
            if (gDownloadMatch) return gDownloadMatch[1];

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

// --- NEW SEARCH ARCHITECTURE --- //

// Fallback logic in case the site search fails
function fallbackSlugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Dynamically search the site to resolve the correct URL slug
async function searchAnimeSlug(title) {
    const query = encodeURIComponent(title);
    
    // Most anime sites use ?s= query. Adjust if an1me.to uses something like /search?keyword=
    const searchUrl = `https://an1me.to/?s=${query}`; 
    console.log(`[Extractor] Searching for actual slug: ${searchUrl}`);

    try {
        const html = await fetchText(searchUrl);
        const $ = cheerio.load(html);
        let exactSlug = null;

        // Loop through links to find the first valid show URL.
        // *NOTE: If this grabs the wrong link first, change 'a' to the specific class of the search results title (e.g. '.result-title a')
        $('a').each((i, el) => {
            if (exactSlug) return; 
            
            const href = $(el).attr('href');
            if (!href) return;

            // Scenario 1: Link leads directly to a watch/episode page
            if (href.includes('/watch/')) {
                const match = href.match(/\/watch\/([^\/]+)/);
                if (match) {
                    // Strip the episode part to get the pure base slug
                    exactSlug = match[1].replace(/-episode-\d+/i, ''); 
                }
            } 
            // Scenario 2: Link leads to an info/anime page
            else if (href.includes('/anime/')) {
                const match = href.match(/\/anime\/([^\/]+)/);
                if (match) {
                    exactSlug = match[1];
                }
            }
        });

        if (exactSlug) {
            console.log(`[Extractor] Search successful! Found exact slug: ${exactSlug}`);
            return exactSlug;
        }

        console.log(`[Extractor] Search returned no matching links. Falling back to guessing.`);
        return fallbackSlugify(title);

    } catch (err) {
        console.log(`[Extractor] Search network error: ${err.message}. Falling back to guessing.`);
        return fallbackSlugify(title);
    }
}

function extractStreams(slug, episode) {
    // We now use the resolved 'slug' instead of blindly trusting 'title'
    const url = `https://an1me.to/watch/${slug}-episode-${episode}/`;
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

module.exports = { extractStreams, searchAnimeSlug };