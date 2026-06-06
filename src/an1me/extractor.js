const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

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

function fallbackSlugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

async function searchAnimeSlug(titleOrExtra) {
    const titles = [];
    if (typeof titleOrExtra === 'object' && titleOrExtra !== null) {
        if (titleOrExtra.title) titles.push(titleOrExtra.title);
        if (titleOrExtra.name) titles.push(titleOrExtra.name);
        if (titleOrExtra.originalTitle) titles.push(titleOrExtra.originalTitle);
    } else if (typeof titleOrExtra === 'string') {
        titles.push(titleOrExtra);
    }

    const queries = [...new Set(titles.map(t => t.replace(/(Season|Part)\s*\d+/ig, '').trim()))].filter(Boolean);

    for (const baseTitle of queries) {
        const query = encodeURIComponent(baseTitle);
        const searchUrl = `https://an1me.to/?s=${query}`; 
        console.log(`[Extractor] Searching for fallback: ${searchUrl}`);

        try {
            const html = await fetchText(searchUrl);
            const $ = cheerio.load(html);
            let exactSlug = null;

            const targetedLinks = $('article a, .movies-list a, #archive-content a, .result-item a');
            const elementsToSearch = targetedLinks.length > 0 ? targetedLinks : $('a');

            elementsToSearch.each((i, el) => {
                if (exactSlug) return; 
                
                const href = $(el).attr('href');
                if (!href || href === '#' || href === '/' || href.includes('javascript:')) return;
                if (href.includes('?')) return;

                // CRITICAL SAFETY FILTER: Ignore structural layouts like tags/categories completely
                if (href.includes('/category/') || href.includes('/genre/') || href.includes('/tag/')) return;

                let cleanHref = href.replace('https://an1me.to', '').trim();
                const segments = cleanHref.split('/').filter(Boolean);
                
                if (segments.length === 0) return;
                
                let slugCandidate = segments[segments.length - 1];
                if (slugCandidate.includes('episode-')) {
                    slugCandidate = slugCandidate.replace(/-episode-\d+/i, '');
                }

                if (!/^[a-z0-9\-]+$/i.test(slugCandidate)) return;

                const titleWords = baseTitle.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
                let isValid = false;

                if (titleWords.length > 0) {
                    isValid = titleWords.some(word => slugCandidate.toLowerCase().includes(word));
                } else {
                    isValid = slugCandidate.toLowerCase().includes(baseTitle.toLowerCase().replace(/[^a-z0-9]/g, ''));
                }

                if (isValid) {
                    exactSlug = slugCandidate;
                }
            });

            if (exactSlug) {
                console.log(`[Extractor] Dynamic Search successful! Found validated slug: ${exactSlug}`);
                return exactSlug;
            }
        } catch (err) {
            console.log(`[Extractor] Search query execution failed for "${baseTitle}": ${err.message}`);
        }
    }

    const fallback = fallbackSlugify(titles[0] || 'anime');
    console.log(`[Extractor] No verified search links matched. Defaulting to fallback guess: ${fallback}`);
    return fallback;
}

function extractStreams(slug, episode) {
    // Force episode to be a clean sanitized integer number string 
    const cleanEpisode = parseInt(episode, 10) || 1;
    
    const url = `https://an1me.to/watch/${slug}-episode-${cleanEpisode}/`;
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