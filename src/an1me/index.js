const { extractStreams, searchAnimeSlug } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode, extra) {
    try {
        // 1. Core ID Mapping Dictionary
        const slugMap = {
            "65123": "rezero-kara-hajimeru-isekai-seikatsu", // Re:Zero
            "1429": "shingeki-no-kyojin",                   // Attack on Titan
            "2150": "naruto",                               // Naruto
            "31911": "fullmetal-alchemist-brotherhood"      // Fullmetal Alchemist: B
        };

        // 2. Dual-Layer Title Mapping (Bypasses non-matching tracking IDs completely)
        const titleMap = {
            "rezero": "rezero-kara-hajimeru-isekai-seikatsu",
            "rezerostartinglifeinanotherworld": "rezero-kara-hajimeru-isekai-seikatsu",
            "rezerokarahajimeruisekaiseikatsu": "rezero-kara-hajimeru-isekai-seikatsu",
            "naruto": "naruto",
            "attackontitan": "shingeki-no-kyojin",
            "shingekinokyojin": "shingeki-no-kyojin",
            "fullmetalalchemistbrotherhood": "fullmetal-alchemist-brotherhood",
            "fullmetalalchemist": "fullmetal-alchemist-brotherhood"
        };

        // Normalize incoming ID
        let targetId = "";
        if (tmdbId !== null && tmdbId !== undefined) {
            targetId = String(tmdbId).trim().split('.')[0];
        }

        // Extract and clean the title string from whatever metadata object Nuvio provides
        let rawTitle = "";
        if (extra && typeof extra === 'object') {
            rawTitle = extra.title || extra.name || "";
        } else if (typeof extra === 'string') {
            rawTitle = extra;
        }
        if (!rawTitle && tmdbId && typeof tmdbId === 'object') {
            rawTitle = tmdbId.title || tmdbId.name || tmdbId.originalTitle || "";
        }

        const cleanTitleKey = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

        console.log(`[An1me Addon] Routing -> Received ID: "${targetId}", Extracted Title: "${rawTitle}"`);

        let slug = null;

        // Route A: Try ID match first
        if (targetId && slugMap[targetId]) {
            slug = slugMap[targetId];
            console.log(`[An1me Addon] Success: Linked via ID Map -> "${slug}"`);
        } 
        // Route B: Try Title Fall-Safe Match (Catches what the ID map misses on mobile)
        else if (cleanTitleKey && titleMap[cleanTitleKey]) {
            slug = titleMap[cleanTitleKey];
            console.log(`[An1me Addon] Success: Linked via Title Map -> "${slug}"`);
        } 
        // Route C: Live dynamic search fallback
        else {
            console.log(`[An1me Addon] Map Miss. Running dynamic live search routine...`);
            slug = await searchAnimeSlug(extra || tmdbId);
        }
        
        if (!slug) return [];

        const streams = await extractStreams(slug, episode);
        const formattedStreams = [];

        // 3. Fortified Stream URL Filter & Processor
        for (const stream of streams) {
            let finalizedUrl = stream.url;
            
            // PLAYBACK ERROR SHIELD: If a Google Photos link failed to resolve to a video file, 
            // drop it immediately. A native player cannot stream an HTML webpage.
            if (finalizedUrl.includes('photos.google.com') || finalizedUrl.includes('photos.app.goo.gl')) {
                console.log(`[An1me Addon] Dropped unparsed webpage link to protect player: ${stream.title}`);
                continue;
            }

            if (!finalizedUrl.includes('.m3u8') && !finalizedUrl.includes('.mp4')) {
                if (finalizedUrl.includes('googleusercontent.com') || finalizedUrl.includes('googlevideo.com')) {
                    finalizedUrl += '#.mp4';
                } else {
                    finalizedUrl += finalizedUrl.includes('?') ? '&ext=.mp4' : '?ext=.mp4';
                }
            }

            formattedStreams.push({
                ...stream,
                url: finalizedUrl
            });
        }

        return formattedStreams;
    } catch (err) {
        console.log(`[An1me Core Error] Execution halted: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };

if (typeof global !== 'undefined') global.getStreams = getStreams;
if (typeof window !== 'undefined') window.getStreams = getStreams;