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
    var axios = require("axios");
    function getPage2(tmdbId, mediaType, season, episode) {
      return __async(this, null, function* () {
        const title = "naruto";
        const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
        const res = yield axios.get(url, {
          headers: { "Referer": "https://an1me.to/" }
        });
        return res.data;
      });
    }
    module2.exports = { getPage: getPage2 };
  }
});

// src/an1me/extractor.js
var require_extractor = __commonJS({
  "src/an1me/extractor.js"(exports2, module2) {
    var cheerio = require("cheerio-without-node-native");
    function decodeBase64(str) {
      return atob(str);
    }
    function extract2(html) {
      const $ = cheerio.load(html);
      const streams = [];
      $("[data-embed-id]").each((i, el) => {
        try {
          const data = $(el).attr("data-embed-id");
          const parts = data.split(":");
          const serverName = decodeBase64(parts[0]);
          const iframeHtml = decodeBase64(parts[1]);
          const urlMatch = iframeHtml.match(/src="([^"]+)"/);
          if (urlMatch) {
            streams.push({
              title: serverName,
              url: urlMatch[1].replace(/&amp;/g, "&"),
              headers: { "Referer": "https://an1me.to/", "Origin": "https://an1me.to" }
            });
          }
        } catch (e) {
        }
      });
      return streams;
    }
    module2.exports = { extract: extract2 };
  }
});

// src/an1me/index.js
var { getPage } = require_http();
var { extract } = require_extractor();
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const html = yield getPage(tmdbId, mediaType, season, episode);
      return extract(html);
    } catch (e) {
      console.error("Provider Error:", e);
      return [];
    }
  });
}
module.exports = { getStreams };
