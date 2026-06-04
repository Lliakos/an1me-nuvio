/**
 * an1me.to — Nuvio Provider
 * Greek anime (sub/dub) from an1me.to
 * v2.0 — Direct URL construction, no search scraping needed
 */
"use strict";

var BASE = "https://an1me.to";
var TMDB = "https://api.themoviedb.org/3";
var TMDB_KEY = "4ef0d7355d9ffb5151e987764708ce96";

var UA = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Convert a title like "Attack on Titan" → "attack-on-titan"
function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // strip special chars
    .replace(/\s+/g, "-")           // spaces → hyphens
    .replace(/-+/g, "-")            // collapse multiple hyphens
    .replace(/^-|-$/g, "");         // trim hyphens
}

// an1me.to uses romanized Japanese names in slugs, so also try the original_name
function getCandidateSlugs(title, originalTitle) {
  var slugs = [];
  slugs.push(toSlug(title));
  if (originalTitle && originalTitle !== title) {
    slugs.push(toSlug(originalTitle));
  }
  // Some common subtitle removals an1me uses
  var cleaned = title.replace(/:\s*.+$/, "").trim(); // strip subtitle after colon
  if (cleaned !== title) slugs.push(toSlug(cleaned));
  return slugs.filter(function(s, i, a) { return s && a.indexOf(s) === i; });
}

// Probe a watch URL — returns the URL if the page exists (200), null otherwise
function probeUrl(url) {
  return fetch(url, {
    method: "HEAD",
    headers: { "User-Agent": UA, "Referer": BASE + "/" }
  }).then(function(r) {
    return r.ok ? url : null;
  }).catch(function() { return null; });
}

// Try candidate episode URLs one by one, return first that works
function findEpisodeUrl(slugs, epNum) {
  var candidates = [];
  slugs.forEach(function(slug) {
    candidates.push(BASE + "/watch/" + slug + "-episode-" + epNum + "/");
    // Some anime on an1me don't have -episode- suffix for ep 1 (movies)
    if (epNum === 1) {
      candidates.push(BASE + "/watch/" + slug + "/");
    }
  });

  function tryNext(i) {
    if (i >= candidates.length) return Promise.resolve(null);
    return probeUrl(candidates[i]).then(function(result) {
      if (result) return result;
      return tryNext(i + 1);
    });
  }

  return tryNext(0);
}

// Extract stream URL from the watch page HTML
function extractFromPage(watchUrl, epNum) {
  return fetch(watchUrl, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
      "Referer": BASE + "/"
    }
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    var streams = [];

    // 1. HLS m3u8
    var hlsRe = /["'](https?:\/\/[^"']+\.m3u8[^"']{0,200})["']/g;
    var m;
    while ((m = hlsRe.exec(html)) !== null) {
      streams.push({
        name: "An1me.to",
        title: "Επεισόδιο " + epNum + " [HLS]",
        url: m[1],
        quality: "Auto"
      });
      break; // first match is enough
    }

    // 2. Direct MP4
    if (streams.length === 0) {
      var mp4Re = /["'](https?:\/\/[^"']+\.mp4[^"']{0,200})["']/g;
      while ((m = mp4Re.exec(html)) !== null) {
        streams.push({
          name: "An1me.to",
          title: "Επεισόδιο " + epNum + " [MP4]",
          url: m[1],
          quality: "Auto"
        });
        break;
      }
    }

    // 3. Iframe embed player
    if (streams.length === 0) {
      var iframeRe = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
      while ((m = iframeRe.exec(html)) !== null) {
        var src = m[1];
        if (src && src.indexOf("facebook") === -1 && src.indexOf("twitter") === -1
            && src.indexOf("google") === -1) {
          if (src.indexOf("//") === 0) src = "https:" + src;
          streams.push({
            name: "An1me.to",
            title: "Επεισόδιο " + epNum + " [Player]",
            url: src,
            quality: "Auto"
          });
          break;
        }
      }
    }

    // 4. Fallback: give them the watch page itself as external URL
    if (streams.length === 0) {
      streams.push({
        name: "An1me.to",
        title: "Επεισόδιο " + epNum + " — Άνοιγμα στο an1me.to",
        url: watchUrl,
        quality: "External"
      });
    }

    return streams;
  });
}

// ── TMDB lookup ───────────────────────────────────────────────────────────────

function getTmdbInfo(tmdbId, mediaType) {
  var url = TMDB + "/" + (mediaType === "movie" ? "movie" : "tv") + "/" + tmdbId
    + "?api_key=" + TMDB_KEY + "&append_to_response=external_ids";
  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        title: d.title || d.name || "",
        originalTitle: d.original_title || d.original_name || ""
      };
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────

function getStreams(tmdbId, mediaType, season, episode) {
  var epNum = episode ? parseInt(episode, 10) : 1;
  console.log("[An1me] " + mediaType + " " + tmdbId + " S" + season + "E" + epNum);

  return getTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      if (!info.title) {
        console.log("[An1me] No title from TMDB");
        return [];
      }
      console.log("[An1me] Title: " + info.title + " / " + info.originalTitle);

      var slugs = getCandidateSlugs(info.title, info.originalTitle);
      console.log("[An1me] Trying slugs: " + slugs.join(", "));

      return findEpisodeUrl(slugs, epNum)
        .then(function(watchUrl) {
          if (!watchUrl) {
            console.log("[An1me] No episode URL found for ep " + epNum);
            return [];
          }
          console.log("[An1me] Found: " + watchUrl);
          return extractFromPage(watchUrl, epNum);
        });
    })
    .catch(function(err) {
      console.error("[An1me] Error: " + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
