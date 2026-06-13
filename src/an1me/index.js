var DEBUG = false; // Set to true and update LOG_URL when debugging locally
var LOG_URL = 'http://192.168.2.15:3000/log';

function remoteLog(msg) {
    if (!DEBUG) return;
    try {
        var p = fetch(LOG_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: msg
        });
        if (p && typeof p.catch === 'function') { p.catch(function() {}); }
    } catch(e) {}
}

var AN1ME_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://an1me.to/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
};

// SLUG_MAP values can be:
//   - a string: same slug for all seasons
//   - an object keyed by TMDB season number (strings), value is either:
//       - a string: simple slug
//       - { slug, splitAfter, next: { slug, offset } }
//         splitAfter: Nuvio episode number after which we switch to the next slug
//         next.offset: subtract this from the Nuvio ep number to get the ep on the next slug
//     Use '*' as a fallback for unmapped seasons
var SLUG_MAP = {
    // Re:Zero
    // Nuvio S2 is one 25-ep season; an1me.to splits it: eps 1-13 on 2nd-season, eps 14-25 on part-2
    '65942': {
        '1': 'rezero-kara-hajimeru-isekai-seikatsu',
        '2': {
            slug: 'rezero-kara-hajimeru-isekai-seikatsu-2nd-season',
            splitAfter: 13,
            next: {
                slug: 'rezero-kara-hajimeru-isekai-seikatsu-2nd-season-part-2',
                offset: 13
            }
        },
        '3': 'rezero-kara-hajimeru-isekai-seikatsu-3rd-season',
        '4': 'rezero-kara-hajimeru-isekai-seikatsu-4th-season',
        '*': 'rezero-kara-hajimeru-isekai-seikatsu'
    },
    '65123': 'rezero-kara-hajimeru-isekai-seikatsu',

    // Single-season shows
    '1429':  'shingeki-no-kyojin',
    '46260': 'naruto',
    '31911': 'fullmetal-alchemist-brotherhood',
    '30984': 'bleach',
    '46298': 'dragon-ball-z',
    '37854': 'one-piece',
    '13916': 'death-note',
    '71725': 'jujutsu-kaisen',
    '85937': 'demon-slayer-kimetsu-no-yaiba'
};

// Returns { slug, episode } after applying any split-season offset logic.
function resolveSlugAndEp(targetId, season, episode) {
    var entry = SLUG_MAP[targetId];
    if (!entry) return null;

    var seasonEntry;
    if (typeof entry === 'string') {
        seasonEntry = entry;
    } else {
        var s = String(season || 1);
        seasonEntry = entry[s] || entry['*'] || entry['1'];
    }
    if (!seasonEntry) return null;

    if (typeof seasonEntry === 'string') {
        return { slug: seasonEntry, episode: episode };
    }

    // Split-season object
    var ep = parseInt(episode, 10) || 1;
    if (seasonEntry.splitAfter && ep > seasonEntry.splitAfter && seasonEntry.next) {
        var adjustedEp = ep - seasonEntry.next.offset;
        remoteLog('[An1me] Split: ep ' + ep + ' > splitAfter ' + seasonEntry.splitAfter
            + ' -> ' + seasonEntry.next.slug + ' ep ' + adjustedEp);
        return { slug: seasonEntry.next.slug, episode: adjustedEp };
    }
    return { slug: seasonEntry.slug, episode: ep };
}

function plainFetch(url, headers) {
    return fetch(url, { method: 'GET', headers: headers, redirect: 'follow' })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
            return res.text();
        });
}

function safeAtob(b64) {
    if (!b64) return '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var str = String(b64).replace(/\s/g, '').replace(/=+$/, '');
    var bc = 0, bs = 0, idx = 0, output = '';
    while (idx < str.length) {
        var ch = str.charAt(idx++);
        var pos = chars.indexOf(ch);
        if (pos === -1) continue;
        bs = bc % 4 ? bs * 64 + pos : pos;
        if (bc++ % 4) {
            output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
    }
    return output;
}

function inferType(url) {
    if (!url) return null;
    var u = url.toLowerCase();
    if (u.indexOf('.m3u8') !== -1 || u.indexOf('/hls/') !== -1) return 'hls';
    return 'mp4';
}

function parseEmbeds(html) {
    var results = [];
    var re = /data-embed-id=["']([^"']+)["']/g;
    var m;
    while ((m = re.exec(html)) !== null) results.push(m[1]);
    return results;
}

function processEmbed(data) {
    try {
        var colonIdx = data.indexOf(':');
        if (colonIdx === -1) return null;
        var serverName = safeAtob(data.slice(0, colonIdx)).trim();
        var iframeHtml = safeAtob(data.slice(colonIdx + 1));
        var srcMatch = iframeHtml.match(/src=["']([^"']+)["']/);
        if (!srcMatch) return null;
        var iframeSrc = srcMatch[1];
        var krVideoUrl = iframeSrc.indexOf('http') === 0 ? iframeSrc
            : 'https://an1me.to' + (iframeSrc.charAt(0) === '/' ? '' : '/') + iframeSrc;
        var krMatch = iframeSrc.match(/kr-video\/([A-Za-z0-9+\/=_\-]+)/);
        var directUrl = krMatch ? safeAtob(krMatch[1]) : '';
        var isGoogle = directUrl.indexOf('photos.google.com') !== -1 ||
                       directUrl.indexOf('photos.app.goo.gl') !== -1;
        return { serverName: serverName, krVideoUrl: krVideoUrl, directUrl: directUrl, isGoogle: isGoogle };
    } catch(e) { return null; }
}

function extractParamsSources(html) {
    var MARKER = 'const params = ';
    var start = html.indexOf(MARKER);
    if (start === -1) return null;
    start += MARKER.length;
    var depth = 0, end = -1;
    for (var i = start; i < html.length; i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') {
            depth--;
            if (depth === 0) { end = i + 1; break; }
        }
    }
    if (end === -1) return null;
    try {
        var jsonStr = html.slice(start, end).split('\\/').join('/');
        var params = JSON.parse(jsonStr);
        if (params.sources && params.sources.length > 0) return params.sources;
    } catch(e) {
        remoteLog('[An1me] params JSON parse error: ' + e.message);
    }
    return null;
}

function resolveViaKrVideoPage(krVideoUrl, serverName) {
    remoteLog('[An1me] Fetching kr-video page for: ' + serverName);
    return plainFetch(krVideoUrl, AN1ME_HEADERS)
        .then(function(html) {
            remoteLog('[An1me] kr-video page: ' + html.length + ' bytes');
            var sources = extractParamsSources(html);
            if (!sources) {
                remoteLog('[An1me] kr-video: no params.sources found');
                return [];
            }
            remoteLog('[An1me] kr-video: found ' + sources.length + ' source(s)');
            var streams = [];
            for (var i = 0; i < sources.length; i++) {
                var src = sources[i];
                if (!src.url) continue;
                var label = src.html || ('Quality ' + (i + 1));
                var t = inferType(src.url);
                remoteLog('[An1me] Source: ' + label + ' | ' + src.url);
                streams.push({
                    name: 'An1me - ' + serverName + ' ' + label,
                    title: 'An1me ' + serverName + ' ' + label,
                    url: src.url,
                    quality: label,
                    type: t
                    // No Referer — lh3 rejects non-Google referrers
                });
            }
            return streams;
        })
        .catch(function(err) {
            remoteLog('[An1me] kr-video fetch error: ' + err.message);
            return [];
        });
}

function extractStreams(slug, episode) {
    var ep = parseInt(episode, 10) || 1;
    var url = 'https://an1me.to/watch/' + slug + '-episode-' + ep + '/';
    remoteLog('[An1me] Fetching: ' + url);
    return plainFetch(url, AN1ME_HEADERS)
        .then(function(html) {
            remoteLog('[An1me] Page: ' + html.length + ' bytes');
            if (html.length < 1000) { remoteLog('[An1me] WARNING: Short page'); return []; }

            var embeds = parseEmbeds(html);
            remoteLog('[An1me] Found ' + embeds.length + ' embed(s)');

            var promises = embeds.map(function(data, i) {
                var parsed = processEmbed(data);
                if (!parsed || !parsed.directUrl) return Promise.resolve([]);

                remoteLog('[An1me] Embed[' + i + ']: ' + parsed.serverName
                    + ' | google=' + parsed.isGoogle
                    + ' | url=' + parsed.directUrl.slice(0, 70));

                if (!parsed.isGoogle) {
                    var t = inferType(parsed.directUrl);
                    remoteLog('[An1me] Direct CDN: ' + parsed.serverName + ' type=' + t);
                    return Promise.resolve([{
                        name: 'An1me - ' + parsed.serverName,
                        title: 'An1me ' + parsed.serverName,
                        url: parsed.directUrl,
                        quality: 'HD',
                        type: t,
                        headers: {
                            'User-Agent': AN1ME_HEADERS['User-Agent'],
                            'Referer': 'https://an1me.to/',
                            'Origin': 'https://an1me.to'
                        }
                    }]);
                } else {
                    return resolveViaKrVideoPage(parsed.krVideoUrl, parsed.serverName);
                }
            });

            return Promise.all(promises).then(function(results) {
                var out = [];
                for (var i = 0; i < results.length; i++) {
                    var r = results[i];
                    if (Array.isArray(r)) for (var j = 0; j < r.length; j++) out.push(r[j]);
                    else if (r) out.push(r);
                }
                remoteLog('[An1me] Returning ' + out.length + ' stream(s)');
                return out;
            });
        })
        .catch(function(err) {
            remoteLog('[An1me] Page fetch error: ' + err.message);
            return [];
        });
}

function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
}

function searchAnimeSlug(titleOrExtra) {
    var titles = [];
    if (typeof titleOrExtra === 'object' && titleOrExtra !== null) {
        if (titleOrExtra.title) titles.push(titleOrExtra.title);
        if (titleOrExtra.name) titles.push(titleOrExtra.name);
        if (titleOrExtra.originalTitle) titles.push(titleOrExtra.originalTitle);
    } else if (typeof titleOrExtra === 'string') {
        titles.push(titleOrExtra);
    }
    var queries = [];
    for (var qi = 0; qi < titles.length; qi++) {
        var t = titles[qi].replace(/(Season|Part)\s*\d+/ig, '').replace(/:\s*$/, '').trim();
        if (t && queries.indexOf(t) === -1) queries.push(t);
    }
    function tryNext(i) {
        if (i >= queries.length) {
            var fb = slugify(titles[0] || 'anime');
            remoteLog('[An1me] Search exhausted, fallback: ' + fb);
            return Promise.resolve(fb);
        }
        var baseTitle = queries[i];
        var searchUrl = 'https://an1me.to/?s=' + encodeURIComponent(baseTitle);
        remoteLog('[An1me] Searching: ' + searchUrl);
        return plainFetch(searchUrl, AN1ME_HEADERS)
            .then(function(html) {
                var hrefRe = /href=["']([^"']+)["']/g;
                var m; var found = null;
                var titleWords = baseTitle.toLowerCase().split(/[^a-z0-9]+/).filter(function(w) { return w.length > 2; });
                while ((m = hrefRe.exec(html)) !== null && !found) {
                    var href = m[1];
                    if (!href || href === '#' || href === '/' || href.indexOf('javascript:') !== -1 || href.indexOf('?') !== -1) continue;
                    var clean = href.replace('https://an1me.to', '').trim();
                    var animeMatch = clean.match(/^\/anime\/([a-z0-9\-]+)\/?$/i);
                    var watchMatch = clean.match(/^\/watch\/([a-z0-9\-]+)-episode-\d+\/?$/i);
                    var candidate = animeMatch ? animeMatch[1] : (watchMatch ? watchMatch[1] : null);
                    if (!candidate) continue;
                    for (var wi = 0; wi < titleWords.length; wi++) {
                        if (candidate.toLowerCase().indexOf(titleWords[wi]) !== -1) { found = candidate; break; }
                    }
                }
                if (found) { remoteLog('[An1me] Found slug: ' + found); return found; }
                return tryNext(i + 1);
            })
            .catch(function() { return tryNext(i + 1); });
    }
    return tryNext(0);
}

function extractStreamsWithFallback(slug, episode) {
    return extractStreams(slug, episode).then(function(streams) {
        if (streams && streams.length > 0) return streams;
        var cleanSlug = slug.replace(/-+$/, '').replace(/--+/g, '-');
        if (cleanSlug !== slug) {
            remoteLog('[An1me] Retrying with cleaned slug: ' + cleanSlug);
            return extractStreams(cleanSlug, episode);
        }
        return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
    remoteLog('[An1me] getStreams called | id=' + tmdbId + ' type=' + mediaType + ' s=' + season + ' ep=' + episode);
    var targetId = '';
    if (tmdbId !== null && tmdbId !== undefined) {
        targetId = String(tmdbId).trim().replace(/^tmdb:/i, '').split('.')[0];
    }
    remoteLog('[An1me] TMDB ID: "' + targetId + '"');

    var resolved = resolveSlugAndEp(targetId, season, episode);
    if (resolved) {
        remoteLog('[An1me] Dict hit: ' + resolved.slug + ' ep=' + resolved.episode + ' (s=' + season + ')');
        return extractStreamsWithFallback(resolved.slug, resolved.episode);
    }

    remoteLog('[An1me] Dict miss - searching...');

    if (targetId && targetId !== '0') {
        var mtype = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + mtype + '/' + targetId + '?api_key=1865f43a0549ca50d341dd9ab8b29f49';
        remoteLog('[An1me] Fetching TMDB title for: ' + targetId);
        return fetch(tmdbUrl, { method: 'GET', headers: AN1ME_HEADERS, redirect: 'follow' })
            .then(function(res) { return res.text(); })
            .then(function(text) {
                try {
                    var info = JSON.parse(text);
                    var title = info.name || info.title || info.original_name || info.original_title;
                    if (title) {
                        remoteLog('[An1me] TMDB title: ' + title);
                        return searchAnimeSlug({ title: title, name: title }).then(function(foundSlug) {
                            return foundSlug ? extractStreamsWithFallback(foundSlug, episode) : [];
                        });
                    }
                } catch(e) { remoteLog('[An1me] TMDB parse error: ' + e.message); }
                return [];
            })
            .catch(function(err) { remoteLog('[An1me] TMDB fetch error: ' + err.message); return []; });
    }

    return Promise.resolve([]);
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof global !== 'undefined') { global.getStreams = getStreams; }
if (typeof window !== 'undefined') { window.getStreams = getStreams; }
if (typeof self !== 'undefined') { self.getStreams = getStreams; }