const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://an1me.to/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

// Google Photos requires NO Referer and different Accept headers or it returns a bot-detection page
const GOOGLE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    // No Referer - sending an1me.to as referer causes Google to reject or return shell page
};

function fetchText(url) {
    return fetch(url, {
        method: 'GET',
        headers: HEADERS
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.text();
    });
}

function fetchTextGoogle(url) {
    return fetch(url, {
        method: 'GET',
        headers: GOOGLE_HEADERS
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.text();
    });
}

module.exports = { fetchText, fetchTextGoogle, HEADERS };