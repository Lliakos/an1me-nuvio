const { getPage } = require('./http.js');
const { extract } = require('./extractor.js');

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const html = await getPage(tmdbId, mediaType, season, episode);
    return extract(html);
  } catch (e) {
    console.error(e);
    return [];
  }
}

module.exports = { getStreams };