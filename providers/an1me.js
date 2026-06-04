/**
 * an1me.to — Nuvio Provider v4
 * Fixes: Referer header for playback + better slug generation using original_name
 */
"use strict";

var BASE = "https://an1me.to";
var TMDB = "https://api.themoviedb.org/3";
var TMDB_KEY = "4ef0d7355d9ffb5151e987764708ce96";
var UA = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

var STREAM_HEADERS = {
  "Referer": "https://an1me.to/",
  "Origin": "https://an1me.to"
};

function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // strip special chars (colons, dashes, etc)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCandidateSlugs(title, originalTitle) {
  var seen = {};
  var slugs = [];

  function add(s) {
    s = s && s.trim();
    if (s && !seen[s]) { seen[s] = true; slugs.push(s); }
  }

  // 1. English title as-is
  add(toSlug(title));

  // 2. Original Japanese romanized title (most reliable for an1me.to)
  if (originalTitle) add(toSlug(originalTitle));

  // 3. English title without subtitle after colon (e.g. "Naruto: Shippuden" → "naruto")
  add(toSlug(title.replace(/[:\-–].+$/, "").trim()));

  // 4. Original title without subtitle after colon
  if (originalTitle) add(toSlug(originalTitle.replace(/[:\-–].+$/, "").trim()));

  // 5. Strip common season suffixes an1me may omit
  // e.g. "re-zero-kara-hajimeru-isekai-seikatsu-2nd-season" → "re-zero-kara-hajimeru-isekai-seikatsu"
  slugs.slice().forEach(function(s) {
    var stripped = s.replace(/-(1st|2nd|3rd|[0-9]+th|second|third|fourth)-season$/, "");
    add(stripped);
    var stripped2 = s.replace(/-season-[0-9]+$/, "");
    add(stripped2);
  });

  return slugs;
}

function getTmdbInfo(tmdbId, mediaType) {
  var url = TMDB + "/" + (mediaType === "movie" ? "movie" : "tv") + "/" + tmdbId + "?api_key=" + TMDB_KEY;
  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        title: d.title || d.name || "",
        originalTitle: d.original_title || d.original_name || ""
      };
    });
}

function fetchWatchPage(slug, epNum) {
  var url = BASE + "/watch/" + slug + "-episode-" + epNum + "/";
  return fetch(url, {
    headers: { "User-Agent": UA, "Accept": "text/html,*/*;q=0.8", "Referer": BASE + "/" }
  }).then(function(r) {
    // 404 or redirect means this slug doesn't exist
    if (!r.ok || r.url.indexOf("/watch/") === -1) return null;
    return r.text();
  }).catch(function() { return null; });
}

function extractStreams(html, epNum, watchUrl) {
  if (!html) return [];
  var streams = [];
  var seen = {};

  // Match /kr-video/BASE64 links — decode to direct stream URLs
  var krRe = /href="(https?:\/\/an1me\.to\/kr-video\/([A-Za-z0-9+\/=]+)[^"]*)"/g;
  var m;
  var serverNames = ["An1 Server", "Alpha Server", "Beta Server", "Gamma Server"];
  var idx = 0;

  while ((m = krRe.exec(html)) !== null) {
    var b64 = m[2];
    if (seen[b64]) continue;
    seen[b64] = true;
    try {
      var decoded = atob(b64);
      if (decoded && decoded.indexOf("http") === 0) {
        var label = serverNames[idx] || ("Server " + (idx + 1));
        var isMp4 = decoded.indexOf(".mp4") !== -1;
        streams.push({
          name: "An1me.to",
          title: "Επεισόδιο " + epNum + " · " + label + " [GR]",
          url: decoded,
          quality: isMp4 ? "MP4" : "HLS",
          headers: STREAM_HEADERS
        });
        idx++;
      }
    } catch (e) { /* skip bad base64 */ }
  }

  return streams;
}

function getStreams(tmdbId, mediaType, season, episode) {
  var epNum = episode ? parseInt(episode, 10) : 1;
  console.log("[An1me] " + mediaType + " tmdb:" + tmdbId + " S" + season + "E" + epNum);

  return getTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      if (!info.title) { console.log("[An1me] No TMDB title"); return []; }
      console.log("[An1me] Title: " + info.title + " | Original: " + info.originalTitle);

      var slugs = getCandidateSlugs(info.title, info.originalTitle);
      console.log("[An1me] Slugs to try: " + slugs.join(", "));

      function trySlug(i) {
        if (i >= slugs.length) {
          console.log("[An1me] No slug matched for ep " + epNum);
          return Promise.resolve([]);
        }
        return fetchWatchPage(slugs[i], epNum)
          .then(function(html) {
            if (!html) return trySlug(i + 1);
            var streams = extractStreams(html, epNum);
            if (streams.length === 0) return trySlug(i + 1);
            console.log("[An1me] " + streams.length + " stream(s) via slug: " + slugs[i]);
            return streams;
          });
      }

      return trySlug(0);
    })
    .catch(function(err) {
      console.error("[An1me] Error: " + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };