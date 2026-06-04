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
    var HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://an1me.to/"
    };
    function fetchText(url) {
      return __async(this, null, function* () {
        const response = yield axios.get(url, { headers: HEADERS });
        return response.data;
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
    function extractStreams2(title, episode) {
      return __async(this, null, function* () {
        const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
        const html = yield fetchText(url);
        const $ = cheerio.load(html);
        const streams = [];
        $("[data-embed-id]").each((i, el) => {
          const data = $(el).attr("data-embed-id");
          const [name, iframe] = data.split(":");
          const urlMatch = atob(iframe).match(/src="([^"]+)"/);
          if (urlMatch) {
            streams.push({
              name: "An1me",
              title: atob(name),
              url: urlMatch[1],
              headers: HEADERS
            });
          }
        });
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
    const title = "naruto";
    return yield extractStreams(title, episode);
  });
}
module.exports = { getStreams };
