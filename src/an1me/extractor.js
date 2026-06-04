const cheerio = require('cheerio-without-node-native');

function decodeBase64(str) {
  // Simple, universal base64 decoder
  return atob(str); 
}

function extract(html) {
  const $ = cheerio.load(html);
  const streams = [];

  $('[data-embed-id]').each((i, el) => {
    try {
      const data = $(el).attr('data-embed-id');
      const parts = data.split(':');
      
      // Use the universal decoder
      const serverName = decodeBase64(parts[0]);
      const iframeHtml = decodeBase64(parts[1]);
      
      const urlMatch = iframeHtml.match(/src="([^"]+)"/);
      if (urlMatch) {
        streams.push({
          title: serverName,
          url: urlMatch[1].replace(/&amp;/g, '&'),
          headers: { "Referer": "https://an1me.to/", "Origin": "https://an1me.to" }
        });
      }
    } catch (e) { /* ignore */ }
  });
  return streams;
}

module.exports = { extract };