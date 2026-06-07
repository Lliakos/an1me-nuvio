const cheerio = require('cheerio-without-node-native');
const { fetchText, fetchTextGoogle, HEADERS } = require('./http.js');

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

// Extracts a URL that is terminated by a JSON string boundary.
// Stops at: " ' \ < > whitespace
function extractUrlUntilBoundary(html, startIdx) {
    let url = '';
    for (let i = startIdx; i < html.length; i++) {
        const c = html[i];
        if (c === '"' || c === "'" || c === '\\' || c === '<' || c === '>' || c === ' ' || c === '\n' || c === '\r' || c === '\t') {
            break;
        }
        url += c;
    }
    return url;
}

function extractGooglePhotosMp4(googlePhotosUrl) {
    console.log(`[Extractor] Fetching Google Photos page: ${googlePhotosUrl}`);
    return fetchTextGoogle(googlePhotosUrl)
        .then(html => {
            // Decode unicode escapes first — Google embeds URLs with \u002F etc.
            const decoded = html
                .replace(/\\u002F/gi, '/')
                .replace(/\\u0026/gi, '&')
                .replace(/\\u003d/gi, '=')
                .replace(/\\u003D/gi, '=')
                .replace(/\\u003a/gi, ':')
                .replace(/\\u003A/gi, ':');

            // ── Priority 1: video-downloads CDN ──────────────────────────────
            // Real token chars: A-Za-z0-9_-~.%=+ (percent-encoded path segments)
            // We find the start position then grab everything up to a JSON boundary.
            const VD_PREFIX = 'https://video-downloads.googleusercontent.com/';
            let idx = decoded.indexOf(VD_PREFIX);
            if (idx !== -1) {
                const url = extractUrlUntilBoundary(decoded, idx);
                if (url.length > VD_PREFIX.length) {
                    console.log(`[Extractor] Found video-downloads URL`);
                    return url;
                }
            }

            // Also try the raw (non-decoded) HTML in case the URL itself isn't escaped
            idx = html.indexOf(VD_PREFIX);
            if (idx !== -1) {
                const url = extractUrlUntilBoundary(html, idx);
                if (url.length > VD_PREFIX.length) {
                    console.log(`[Extractor] Found video-downloads URL (raw html)`);
                    return url;
                }
            }

            // ── Priority 2: googlevideo streaming URL ─────────────────────────
            // These look like: https://r3---sn-abc123.googlevideo.com/videoplayback?...
            const gvMatch = decoded.match(/https:\/\/[a-z0-9\-\.]+-googlevideo\.com\/videoplayback[^"'<>\s\\]+/i)
                         || decoded.match(/https:\/\/[a-z0-9\-]+\.googlevideo\.com\/videoplayback[^"'<>\s\\]+/i);
            if (gvMatch) {
                console.log(`[Extractor] Found googlevideo URL`);
                return gvMatch[0];
            }

            // ── Priority 3: any googleusercontent with a long token ───────────
            const GUC_PREFIX = 'https://';
            const gcSearch = decoded.match(/https:\/\/[a-z0-9\-]+\.googleusercontent\.com\/[^"'<>\s\\]{50,}/);
            if (gcSearch) {
                console.log(`[Extractor] Found generic googleusercontent URL`);
                return gcSearch[0];
            }

            // ── Debug: dump a slice of the HTML so you can see what changed ───
            const sample = decoded.slice(0, 500).replace(/\s+/g, ' ');
            console.log(`[Extractor] No video URL found. HTML length: ${html.length}. Sample:\n${sample}`);
            return null;
        })
        .catch(err => {
            console.log(`[Extractor] Google Photos fetch error: ${err.message}`);
            return null;
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
        console.log(`[Extractor] Searching: ${searchUrl}`);

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

                if (isValid) exactSlug = slugCandidate;
            });

            if (exactSlug) {
                console.log(`[Extractor] Search found slug: ${exactSlug}`);
                return exactSlug;
            }
        } catch (err) {
            console.log(`[Extractor] Search failed for "${baseTitle}": ${err.message}`);
        }
    }

    const fallback = fallbackSlugify(titles[0] || 'anime');
    console.log(`[Extractor] Falling back to slugified guess: ${fallback}`);
    return fallback;
}

function extractStreams(slug, episode) {
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
                    if (!urlMatch) return;

                    const embedUrl = urlMatch[1];
                    const krVideoMatch = embedUrl.match(/kr-video\/([^?&#]+)/);
                    if (!krVideoMatch) return;

                    const decodedLink = safeAtob(krVideoMatch[1]);

                    if (decodedLink.includes('photos.google.com') || 
                        decodedLink.includes('photos.app.goo.gl') || 
                        decodedLink.includes('googleusercontent.com')) {
                        
                        console.log(`[Extractor] Google Photos stream detected: ${serverName}`);
                        const p = extractGooglePhotosMp4(decodedLink).then(playableUrl => {
                            if (!playableUrl) {
                                console.log(`[Extractor] Dropping "${serverName}" — could not resolve.`);
                                return null;
                            }
                            // Google CDN blocks requests with a foreign Referer.
                            // Only send User-Agent — no Referer.
                            return {
                                name: "An1me",
                                title: serverName,
                                url: playableUrl,
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                }
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
                } catch (e) {
                    console.log("[Extractor] Embed parse error:", e.message);
                }
            });

            return Promise.all(promises).then(results => results.filter(Boolean));
        })
        .catch(err => {
            console.log(`[Extractor] Page fetch error: ${err.message}`);
            return [];
        });
}

module.exports = { extractStreams, searchAnimeSlug };