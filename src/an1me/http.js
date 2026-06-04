const axios = require('axios');

async function getPage(tmdbId, mediaType, season, episode) {
  const url = "https://an1me.to/watch/naruto-episode-1/"; // Hardcode one known URL
  const res = await axios.get(url, { headers: { "Referer": "https://an1me.to/" } });
  return res.data;
}

module.exports = { getPage };