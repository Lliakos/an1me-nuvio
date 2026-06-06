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
    function safeAtob(input) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      let str = input.replace(/=+$/, "");
      let output = "";
      if (str.length % 4 === 1) return "";
      for (let bc = 0, bs = 0, idx = 0; idx < str.length; idx++) {
        const char = str.charAt(idx);
        const p = chars.indexOf(char);
        if (p === -1) continue;
        bs = bc % 4 ? bs * 64 + p : p;
        if (bc++ % 4) {
          output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
        }
      }
      return output;
    }
    function extractGooglePhotosMp4(googlePhotosUrl) {
      return fetchText(googlePhotosUrl).then((html) => {
        const videoMatch = html.match(/(https:\/\/[^\s"']+\.googlevideo\.com\/videoplayback[^\s"']+)/);
        if (videoMatch) {
          return videoMatch[1].replace(/\\u0026/g, "&");
        }
        return googlePhotosUrl;
      }).catch(() => googlePhotosUrl);
    }
    function extractStreams2(title, episode) {
      const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
      return fetchText(url).then((html) => {
        const $ = cheerio.load(html);
        const promises = [];
        $("[data-embed-id]").each((i, el) => {
          try {
            const data = $(el).attr("data-embed-id");
            const parts = data.split(":");
            const serverName = safeAtob(parts[0]).trim();
            const decodedIframe = safeAtob(parts[1]);
            const urlMatch = decodedIframe.match(/src="([^"]+)"/);
            if (urlMatch) {
              const embedUrl = urlMatch[1];
              const krVideoMatch = embedUrl.match(/kr-video\/([^?]+)/);
              if (krVideoMatch) {
                const decodedLink = safeAtob(krVideoMatch[1]);
                if (decodedLink.indexOf("photos.google.com") !== -1 || decodedLink.indexOf("googleusercontent.com") !== -1) {
                  const p = extractGooglePhotosMp4(decodedLink).then((playableUrl) => {
                    return {
                      name: "An1me",
                      title: serverName,
                      url: playableUrl,
                      headers: HEADERS
                    };
                  });
                  promises.push(p);
                } else {
                  promises.push(Promise.resolve({
                    name: "An1me",
                    title: serverName,
                    url: decodedLink,
                    headers: HEADERS
                  }));
                }
              }
            }
          } catch (e) {
          }
        });
        return Promise.all(promises);
      }).catch(() => []);
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
  const defaults = {
    "46260": "Naruto",
    "1429": "Shingeki no Kyojin",
    "31911": "Fullmetal Alchemist Brotherhood"
  };
  const title = (extra == null ? void 0 : extra.title) || (extra == null ? void 0 : extra.name) || (extra == null ? void 0 : extra.originalTitle) || defaults[tmdbId];
  if (!title) {
    return Promise.resolve([]);
  }
  const slug = slugify(title);
  return extractStreams(slug, episode);
}
module.exports = { getStreams };
