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

// src/an1me/index.js
function getStreams(tmdbId, mediaType, season, episode, extra) {
  return __async(this, null, function* () {
    try {
      console.log("[An1me Test] Provider function invoked successfully!");
      return [
        {
          name: "An1me Test Server",
          title: `Testing ID: ${tmdbId} | Ep: ${episode}`,
          url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        }
      ];
    } catch (error) {
      console.error("[An1me Test] Error:", error.message);
      return [];
    }
  });
}
module.exports = { getStreams };
