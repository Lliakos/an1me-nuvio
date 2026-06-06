var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/an1me/http.js
var require_http = __commonJS({
  "src/an1me/http.js"(exports2, module2) {
    var HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://an1me.to/"
    };
    function fetchText(url) {
      return __async(this, null, function* () {
        const response = yield fetch(url, { headers: HEADERS });
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        return yield response.text();
      });
    }
    module2.exports = { fetchText, HEADERS };
  }
});

// src/an1me/extractor.js
var require_extractor = __commonJS({
  "src/an1me/extractor.js"(exports2, module2) {
    var cheerio = require("cheerio-without-node-native");
    var { fetchText, HEADERS } = require_http();
    function decodeBase64(str) {
      return Buffer.from(str, "base64").toString("utf-8");
    }
    function extractGooglePhotosMp4(googlePhotosUrl) {
      return __async(this, null, function* () {
        try {
          console.log(`Extracting MP4 from Google Photos...`);
          const html = yield fetchText(googlePhotosUrl);
          const videoMatch = html.match(/(https:\/\/[^\s"']+\.googlevideo\.com\/videoplayback[^\s"']+)/);
          if (videoMatch) {
            const cleanUrl = videoMatch[1].replace(/\\u0026/g, "&");
            return cleanUrl;
          }
          return googlePhotosUrl;
        } catch (e) {
          console.log("Failed to extract Google Photos MP4:", e.message);
          return googlePhotosUrl;
        }
      });
    }
    function extractStreams2(title, episode) {
      return __async(this, null, function* () {
        const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
        const html = yield fetchText(url);
        const $ = cheerio.load(html);
        const streams = [];
        console.log(`Searching for embeds on: ${url}`);
        const embedElements = $("[data-embed-id]").toArray();
        for (const el of embedElements) {
          try {
            const data = $(el).attr("data-embed-id");
            const [nameB64, iframeB64] = data.split(":");
            const serverName = decodeBase64(nameB64).trim();
            const decodedIframe = decodeBase64(iframeB64);
            const urlMatch = decodedIframe.match(/src="([^"]+)"/);
            if (urlMatch) {
              const embedUrl = urlMatch[1];
              const krVideoMatch = embedUrl.match(/kr-video\/([^?]+)/);
              let finalPlayableUrl = embedUrl;
              if (krVideoMatch) {
                const decodedLink = decodeBase64(krVideoMatch[1]);
                if (decodedLink.includes("photos.google.com")) {
                  console.log(`[${serverName}] Found Google Photos link, scraping...`);
                  finalPlayableUrl = yield extractGooglePhotosMp4(decodedLink);
                } else if (decodedLink.includes(".m3u8") || decodedLink.includes(".mp4")) {
                  console.log(`[${serverName}] Found direct stream link.`);
                  finalPlayableUrl = decodedLink;
                } else {
                  console.log(`[${serverName}] Found unknown link type.`);
                  finalPlayableUrl = decodedLink;
                }
              }
              streams.push({
                name: "An1me",
                title: serverName,
                url: finalPlayableUrl,
                headers: HEADERS
              });
            }
          } catch (e) {
            console.log("Error parsing embed:", e.message);
          }
        }
        console.log(`Found ${streams.length} playable streams.`);
        return streams;
      });
    }
    module2.exports = { extractStreams: extractStreams2 };
  }
});

// src/an1me/index.js
var { extractStreams } = require_extractor();
function slugify(text) {
  if (!text) return "";
  return text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-");
}
function getStreams(tmdbId, mediaType, season, episode, extra) {
  return __async(this, null, function* () {
    try {
      console.log(`[An1me] getStreams called for TMDB: ${tmdbId}, Type: ${mediaType}`);
      let title = (extra == null ? void 0 : extra.title) || (extra == null ? void 0 : extra.name) || (extra == null ? void 0 : extra.originalTitle);
      if (!title) {
        const defaults = {
          "46260": "Naruto",
          "1429": "Shingeki no Kyojin",
          "31911": "Fullmetal Alchemist Brotherhood"
        };
        title = defaults[tmdbId];
      }
      if (!title) {
        console.log(`[An1me] Could not resolve a title string for TMDB ID: ${tmdbId}`);
        return [];
      }
      const slug = slugify(title);
      console.log(`[An1me] Processing slug: ${slug} | Episode: ${episode}`);
      const streams = yield extractStreams(slug, episode);
      return streams;
    } catch (error) {
      console.error("[An1me] Critical provider error:", error.message);
      return [];
    }
  });
}
module.exports = { getStreams };
