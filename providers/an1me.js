/**
 * an1me.to — Nuvio Provider v7
 * Correctly extracts streams from data-embed-id attributes (double base64)
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
    .replace(/[^a-z0-9\s]/g, " ")
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
  add(toSlug(title.replace(/[:\-–].+$/, "").trim()));
  if (originalTitle) add(toSlug(originalTitle.replace(/[:\-–].+$/, "").trim()));
  slugs.slice().forEach(function(s) {
    add(s.replace(/-(1st|2nd|3rd|[0-9]+th|second|third|fourth)-season$/, ""));
    add(s.replace(/-season-[0-9]+$/, ""));
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
    if (typeof html !== "string" || html.indexOf("data-embed-id") === -1) return null;
    return html;
  } catch (e) {
    return null;
  }
}

function extractStreams(html, epNum) {
  var streams = [];
  var seen = {};

  // Each server is stored as: data-embed-id="BASE64(serverName):BASE64(iframeHTML)"
  var embedRe = /data-embed-id="([A-Za-z0-9+\/=]+):([A-Za-z0-9+\/=]+)"/g;
  var m;

  while ((m = embedRe.exec(html)) !== null) {
    try {
      var serverName = atob(m[1]).replace(/sub$|dub$/i, "").trim();
      var iframeHtml = atob(m[2]);

      // Extract the kr-video URL from the decoded iframe HTML
      var srcMatch = iframeHtml.match(/src="(https:\/\/an1me\.to\/kr-video\/([A-Za-z0-9+\/=]+))/);
      if (!srcMatch) continue;

      var b64stream = srcMatch[2];
      if (seen[b64stream]) continue;
      seen[b64stream] = true;

      var streamUrl = atob(b64stream);
      if (!streamUrl || streamUrl.indexOf("http") !== 0) continue;

      var isDub = /dub/i.test(atob(m[1]));
      var label = serverName + (isDub ? " [GR DUB]" : " [GR SUB]");

      streams.push({
        name: "An1me.to",
        title: "Επεισόδιο " + epNum + " · " + label,
        url: streamUrl,
        quality: streamUrl.indexOf(".mp4") !== -1 ? "MP4" : "HLS",
        headers: STREAM_HEADERS
      });
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
        console.log("[An1me] Found " + streams.length + " stream(s) via: " + slugs[i]);
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