const { getStreams } = require('./providers/an1me.js');

async function test() {
  console.log('Testing...');
  // Use a real Anime TMDB ID (e.g., 2150 is Naruto)
  const streams = await getStreams('2150', 'tv', 1, 1); 
  console.log('Streams found:', streams);
}

test();