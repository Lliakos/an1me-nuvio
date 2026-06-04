/**
 * an1me - Nuvio Provider for an1me.to
 * Greek anime streaming (subtitled & dubbed)
 * Uses TMDB API to resolve titles, then searches an1me.to
 */
"use strict";

var BASE_URL = "https://an1me.to";
var TMDB_BASE = "https://api.themoviedb.org/3";
// Public TMDB read-only key (same one Nuvio uses internally)
var TMDB_KEY = "4ef0d7355d9ffb5151e987764708ce96";

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};

// ─── STEP 1: Resolve TMDB ID → anime title ───────────────────────────────────

function getTitleFromTmdb(tmdbId, mediaType) {
  var endpoint = mediaType === "movie"
    ? (TMDB_BASE + "/movie/" + tmdbId + "?api_key=" + TMDB_KEY)
    : (TMDB_BASE + "/tv/" + tmdbId + "?api_key=" + TMDB_KEY);

  return fetch(endpoint)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      return data.title || data.name || null;
    });
}

// ─── STEP 2: Search an1me.to for the title ───────────────────────────────────

function searchAn1me(title) {
  var query = encodeURIComponent(title);
  var url = BASE_URL + "/search/?s_keyword=" + query + "&s_orderby=popular";

  return fetch(url, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      // Extract anime page links — pattern: href="https://an1me.to/anime/slug/"
      var results = [];
      var re = /href="(https:\/\/an1me\.to\/anime\/([^"\/]+)\/?)"/g;
      var titleRe = /class="[^"]*title[^"]*"[^>]*>([^<]+)<\/|alt="([^"]+)"/g;
      var match;

      // Collect unique anime URLs
      var seen = {};
      while ((match = re.exec(html)) !== null) {
        var fullUrl = match[1];
        var slug = match[2];
        if (!seen[slug] && slug && slug !== "anime") {
          seen[slug] = true;
          results.push({ url: fullUrl, slug: slug });
        }
      }

      return results.slice(0, 3); // top 3 results
    });
}

// ─── STEP 3: Get episode list from anime page ─────────────────────────────────

function getAnimeEpisodes(animeUrl, slug) {
  return fetch(animeUrl, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var episodes = {};
      var re = /href="(https:\/\/an1me\.to\/watch\/[^"]+?-episode-(\d+)\/?[^"]*)"/g;
      var match;
      while ((match = re.exec(html)) !== null) {
        var epUrl = match[1];
        var epNum = parseInt(match[2], 10);
        if (!episodes[epNum]) {
          episodes[epNum] = epUrl;
        }
      }
      return episodes;
    });
}

// ─── STEP 4: Extract stream from watch page ───────────────────────────────────

function extractStream(watchUrl, epNum) {
  return fetch(watchUrl, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var streams = [];

      // Try HLS m3u8 directly in page source
      var hlsRe = /['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/g;
      var match = hlsRe.exec(html);
      if (match) {
        streams.push({
          name: "An1me.to",
          title: "Επεισόδιο " + epNum + " · HLS",
          url: match[1],
          quality: "Auto"
        });
      }

      // Try direct mp4
      var mp4Re = /['"](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/g;
      var mp4Match = mp4Re.exec(html);
      if (mp4Match) {
        streams.push({
          name: "An1me.to",
          title: "Επεισόδιο " + epNum + " · MP4",
          url: mp4Match[1],
          quality: "Auto"
        });
      }

      // Try iframe embed src as external player fallback
      var iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
      var iMatch;
      while ((iMatch = iframeRe.exec(html)) !== null) {
        var src = iMatch[1];
        if (src && src.indexOf("facebook") === -1 && src.indexOf("twitter") === -1) {
          if (src.indexOf("//") === 0) src = "https:" + src;
          streams.push({
            name: "An1me.to",
            title: "Επεισόδιο " + epNum + " · Embedded Player",
            url: src,
            quality: "Auto",
            isEmbed: true
          });
          break; // only first iframe
        }
      }

      return streams;
    });
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

function fetchStreams(tmdbId, mediaType, season, episode) {
  console.log("[An1me] Fetching " + mediaType + " tmdb:" + tmdbId + " S" + season + "E" + episode);

  var targetEp = episode ? parseInt(episode, 10) : 1;

  return getTitleFromTmdb(tmdbId, mediaType)
    .then(function(title) {
      if (!title) {
        console.log("[An1me] Could not resolve title from TMDB");
        return [];
      }
      console.log("[An1me] Resolved title: " + title);
      return searchAn1me(title)
        .then(function(results) {
          if (!results || results.length === 0) {
            console.log("[An1me] No results found on an1me.to for: " + title);
            return [];
          }
          var best = results[0];
          console.log("[An1me] Best match: " + best.slug);
          return getAnimeEpisodes(best.url, best.slug)
            .then(function(episodes) {
              var epUrl = episodes[targetEp];
              if (!epUrl) {
                // Try episode 1 as fallback for movies
                epUrl = episodes[1] || Object.values(episodes)[0];
              }
              if (!epUrl) {
                console.log("[An1me] Episode " + targetEp + " not found");
                return [];
              }
              console.log("[An1me] Found episode URL: " + epUrl);
              return extractStream(epUrl, targetEp);
            });
        });
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return fetchStreams(tmdbId, mediaType, season, episode)
    .catch(function(err) {
      console.error("[An1me] Error: " + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
