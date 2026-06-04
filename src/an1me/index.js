const { getPage } = require('./http.js');
const { extract } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const html = await getPage(tmdbId, mediaType, season, episode);
    // This now returns the real streams from your extractor
    return extract(html); 
  } catch (e) {
    console.error("Provider Error:", e);
    return [];
  }
}

module.exports = { getStreams };