const { getPage } = require('./http.js');

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const html = await getPage(tmdbId, mediaType, season, episode);
    // Return a dummy object just to prove the HTML fetched successfully
    return [{ title: "Fetched Length: " + html.length, url: "https://test.com" }];
  } catch (e) {
    return [{ title: "Error: " + e.message, url: "https://test.com" }];
  }
}

module.exports = { getStreams };