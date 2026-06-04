/**
 * an1me.to — Nuvio Provider v3
 * Extracts HLS streams from an1me.to's /kr-video/ base64-encoded links
 */
"use strict";

var BASE = "https://an1me.to";
var TMDB = "https://api.themoviedb.org/3";
var TMDB_KEY = "4ef0d7355d9ffb5151e987764708ce96";
var UA = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTmdbInfo(tmdbId, mediaType) {
  var url = TMDB + "/" + (mediaType === "movie" ? "movie" : "tv") + "/" + tmdbId
    + "?api_key=" + TMDB_KEY;
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
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,*/*;q=0.8",
      "Referer": BASE + "/"
    }
  }).then(function(r) {
    if (!r.ok) return null;
    return r.text();
  }).catch(function() { return null; });
}

function extractStreams(html, epNum) {
  if (!html) return [];
  var streams = [];

  // Match /kr-video/BASE64 links — these decode to direct m3u8 URLs
  var krRe = /href="(https?:\/\/an1me\.to\/kr-video\/([A-Za-z0-9+/=]+))[^"]*"/g;
  var m;
  var seen = {};
  while ((m = krRe.exec(html)) !== null) {
    var b64 = m[2];
    if (seen[b64]) continue;
    seen[b64] = true;
    try {
      var decoded = atob(b64);
      if (decoded && decoded.indexOf("http") === 0) {
        var label = streams.length === 0 ? "An1 Server" : "Alpha Server";
        streams.push({
          name: "An1me.to",
          title: "Επεισόδιο " + epNum + " · " + label + " [GR]",
          url: decoded,
          quality: "Auto"
        });
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
      if (!info.title) return [];

      var slugs = [toSlug(info.title)];
      if (info.originalTitle && info.originalTitle !== info.title) {
        slugs.push(toSlug(info.originalTitle));
      }
      // Also try without subtitle (e.g. "Naruto: Shippuden" → "naruto")
      var noSuffix = toSlug(info.title.replace(/[:\-–].+$/, "").trim());
      if (noSuffix && slugs.indexOf(noSuffix) === -1) slugs.push(noSuffix);

      console.log("[An1me] Trying slugs: " + slugs.join(", "));

      function trySlug(i) {
        if (i >= slugs.length) return Promise.resolve([]);
        return fetchWatchPage(slugs[i], epNum)
          .then(function(html) {
            if (!html) return trySlug(i + 1);
            var streams = extractStreams(html, epNum);
            if (streams.length === 0) return trySlug(i + 1);
            console.log("[An1me] Got " + streams.length + " stream(s) from slug: " + slugs[i]);
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