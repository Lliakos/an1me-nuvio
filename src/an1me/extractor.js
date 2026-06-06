const cheerio = require('cheerio-without-node-native');
const { fetchText, HEADERS } = require('./http.js');

function safeAtob(input) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';
    if (str.length % 4 === 1) return '';
    for (let bc = 0, bs = 0, idx = 0; idx < str.length; idx++) {
        const char = str.charAt(idx);
        const p = chars.indexOf(char);
        if (p === -1) continue;
        bs = bc % 4 ? bs * 64 + p : p;
        if (bc++ % 4) {
            output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
    }
    return output;
}

function extractGooglePhotosMp4(googlePhotosUrl) {
    return fetchText(googlePhotosUrl)
        .then(html => {
            const videoMatch = html.match(/(https:\/\/[^\s"']+\.googlevideo\.com\/videoplayback[^\s"']+)/);
            if (videoMatch) {
                return videoMatch[1].replace(/\\u0026/g, '&');
            }
            return googlePhotosUrl;
        })
        .catch(() => googlePhotosUrl);
}

function extractStreams(title, episode) {
    const url = `https://an1me.to/watch/${title}-episode-${episode}/`;
    
    return fetchText(url)
        .then(html => {
            const $ = cheerio.load(html);
            const promises = [];

            $('[data-embed-id]').each((i, el) => {
                try {
                    const data = $(el).attr('data-embed-id');
                    const parts = data.split(':');
                    const serverName = safeAtob(parts[0]).trim();
                    const decodedIframe = safeAtob(parts[1]);
                    const urlMatch = decodedIframe.match(/src="([^"]+)"/);

                    if (urlMatch) {
                        const embedUrl = urlMatch[1];
                        const krVideoMatch = embedUrl.match(/kr-video\/([^?]+)/);

                        if (krVideoMatch) {
                            const decodedLink = safeAtob(krVideoMatch[1]);

                            if (decodedLink.indexOf('photos.google.com') !== -1 || decodedLink.indexOf('googleusercontent.com') !== -1) {
                                // It's a Google Photos page: fetch the deep MP4 link
                                const p = extractGooglePhotosMp4(decodedLink).then(playableUrl => {
                                    return {
                                        name: "An1me",
                                        title: serverName,
                                        url: playableUrl,
                                        headers: HEADERS
                                     };
                                });
                                promises.push(p);
                            } else {
                                // Direct stream (e.g., .m3u8 or .mp4)
                                promises.push(Promise.resolve({
                                    name: "An1me",
                                    title: serverName,
                                    url: decodedLink,
                                    headers: HEADERS
                                }));
                            }
                        }
                    }
                } catch (e) {
                    // Fail silently inside the element loop to check remaining items
                }
            });

            return Promise.all(promises);
        })
        .catch(() => []);
}

module.exports = { extractStreams };