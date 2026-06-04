const axios = require('axios');

async function getPage(tmdbId, mediaType, season, episode) {
  // Use axios as per their documentation
  const title = "naruto"; // (Insert logic here to resolve slug from TMDB)
  const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
  const res = await axios.get(url, { 
    headers: { "Referer": "https://an1me.to/" } 
  });
  return res.data;
}

module.exports = { getPage };