/**
 * an1me.to — Nuvio Provider v5
 * Uses axios (provided by Nuvio), async/await, proper slug generation
 */
"use strict";

var axios = require("axios");

var BASE = "https://an1me.to";
var TMDB = "https://api.themoviedb.org/3";
var TMDB_KEY = "4ef0d7355d9ffb5151e987764708ce96";

var FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  "Referer": "https://an1me.to/",
  "Accept": "text/html,*/*;q=0.8"
};

var STREAM_HEADERS = {
  "Referer": "https://an1me.to/",
  "Origin": "https://an1me.to"
};

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")  // replace all special chars with space
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCandidateSlugs(title, originalTitle) {
  var seen = {};
  var slugs = [];

  function add(s) {
    if (s && !seen[s]) { seen[s] = true; slugs.push(s); }
  }

  add(toSlug(title));
  if (originalTitle) add(toSlug(originalTitle));

  // Without subtitle after colon
  add(toSlug(title.replace(/[:\-–].+$/, "").trim()));
  if (originalTitle) add(toSlug(originalTitle.replace(/[:\-–].+$/, "").trim()));

  // Strip season suffixes
  slugs.slice().forEach(function(s) {
    add(s.replace(/-(1st|2nd|3rd|[0-9]+th|second|third|fourth)-season$/, ""));
    add(s.replace(/-season-[0-9]+$/, ""));
    add(s.replace(/-[0-9]+(st|nd|rd|th)-season$/, ""));
  });

  return slugs.filter(Boolean);
}

async function getTmdbInfo(tmdbId, mediaType) {
  var url = TMDB + "/" + (mediaType === "movie" ? "movie" : "tv") + "/" + tmdbId + "?api_key=" + TMDB_KEY;
  var res = await axios.get(url);
  var d = res.data;
  return {
    title: d.title || d.name || "",
    originalTitle: d.original_title || d.original_name || ""
  };
}

async function fetchWatchPage(slug, epNum) {
  var url = BASE + "/watch/" + slug + "-episode-" + epNum + "/";
  try {
    var res = await axios.get(url, { headers: FETCH_HEADERS, validateStatus: null });
    if (res.status !== 200) return null;
    var html = res.data;
    // If page doesn't contain episode content, skip it
    if (typeof html !== "string" || html.indexOf("kr-video") === -1) return null;
    return html;
  } catch (e) {
    return null;
  }
}

function extractStreams(html, epNum) {
  var streams = [];
  var seen = {};
  var serverNames = ["An1 Server", "Alpha Server", "Beta Server", "Gamma Server"];
  var idx = 0;

  var krRe = /href="https?:\/\/an1me\.to\/kr-video\/([A-Za-z0-9+\/=]+)[^"]*"/g;
  var m;

  while ((m = krRe.exec(html)) !== null) {
    var b64 = m[1];
    if (seen[b64]) continue;
    seen[b64] = true;
    try {
      var decoded = atob(b64);
      if (decoded && decoded.indexOf("http") === 0) {
        var label = serverNames[idx] || ("Server " + (idx + 1));
        streams.push({
          name: "An1me.to",
          title: "Επεισόδιο " + epNum + " · " + label + " [GR]",
          url: decoded,
          quality: decoded.indexOf(".mp4") !== -1 ? "MP4" : "HLS",
          headers: STREAM_HEADERS
        });
        idx++;
      }
    } catch (e) {}
  }

  return streams;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  var epNum = episode ? parseInt(episode, 10) : 1;
  console.log("[An1me] " + mediaType + " " + tmdbId + " S" + season + "E" + epNum);

  try {
    var info = await getTmdbInfo(tmdbId, mediaType);
    if (!info.title) { console.log("[An1me] No TMDB title"); return []; }
    console.log("[An1me] Title: " + info.title + " | Original: " + info.originalTitle);

    var slugs = getCandidateSlugs(info.title, info.originalTitle);
    console.log("[An1me] Trying: " + slugs.join(", "));

    for (var i = 0; i < slugs.length; i++) {
      var html = await fetchWatchPage(slugs[i], epNum);
      if (!html) continue;
      var streams = extractStreams(html, epNum);
      if (streams.length > 0) {
        console.log("[An1me] Found " + streams.length + " stream(s) with slug: " + slugs[i]);
        return streams;
      }
    }

    console.log("[An1me] No streams found");
    return [];
  } catch (err) {
    console.error("[An1me] Error: " + err.message);
    return [];
  }
}

module.exports = { getStreams: getStreams };