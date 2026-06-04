const cheerio = require('cheerio-without-node-native');

function extract(html) {
  const $ = cheerio.load(html);
  const streams = [];

  $('[data-embed-id]').each((i, el) => {
    try {
      const data = $(el).attr('data-embed-id');
      const parts = data.split(':');
      // Using Buffer to decode Base64 (Nuvio supports Buffer)
      const serverName = Buffer.from(parts[0], 'base64').toString('utf8');
      const iframeHtml = Buffer.from(parts[1], 'base64').toString('utf8');
      
      const urlMatch = iframeHtml.match(/src="([^"]+)"/);
      if (urlMatch) {
        streams.push({
          title: serverName,
          url: urlMatch[1].replace(/&amp;/g, '&'),
          headers: { "Referer": "https://an1me.to/", "Origin": "https://an1me.to" }
        });
      }
    } catch (e) { /* ignore errors */ }
  });
  return streams;
}

module.exports = { extract };