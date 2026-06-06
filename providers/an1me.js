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
    function extractStreams2(title, episode) {
      return __async(this, null, function* () {
        const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
        const html = yield fetchText(url);
        const $ = cheerio.load(html);
        const streams = [];
        console.log(`Searching for embeds on: ${url}`);
        $("[data-embed-id]").each((i, el) => {
          try {
            const data = $(el).attr("data-embed-id");
            const [nameB64, iframeB64] = data.split(":");
            const serverName = decodeBase64(nameB64);
            const decodedIframe = decodeBase64(iframeB64);
            const urlMatch = decodedIframe.match(/src="([^"]+)"/);
            if (urlMatch) {
              const embedUrl = urlMatch[1];
              const krVideoMatch = embedUrl.match(/kr-video\/([^?]+)/);
              let finalUrl = embedUrl;
              if (krVideoMatch) {
                finalUrl = decodeBase64(krVideoMatch[1]);
              }
              streams.push({
                name: "An1me",
                title: serverName.trim(),
                // e.g., "Alpha Serversub"
                url: finalUrl,
                headers: HEADERS
              });
            }
          } catch (e) {
            console.log("Error parsing embed:", e.message);
          }
        });
        console.log(`Found ${streams.length} streams.`);
        return streams;
      });
    }
    module2.exports = { extractStreams: extractStreams2 };
  }
});

// src/an1me/index.js
var { extractStreams } = require_extractor();
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      return yield extractStreams("naruto", episode);
    } catch (error) {
      console.error(error);
      return [];
    }
  });
}
module.exports = { getStreams };
