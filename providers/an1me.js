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
        const url = "https://an1me.to/watch/naruto-episode-1/";
        const res = yield axios.get(url, { headers: { "Referer": "https://an1me.to/" } });
        return res.data;
      });
    }
    module2.exports = { getPage: getPage2 };
  }
});

// src/an1me/index.js
var { getPage } = require_http();
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const html = yield getPage(tmdbId, mediaType, season, episode);
      return [{ title: "Fetched Length: " + html.length, url: "https://test.com" }];
    } catch (e) {
      return [{ title: "Error: " + e.message, url: "https://test.com" }];
    }
  });
}
module.exports = { getStreams };
