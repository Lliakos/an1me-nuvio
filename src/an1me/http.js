// Ensure headers perfectly mimic an authentic Chrome browser execution frame
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://an1me.to/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

// Ensure your fetchText engine assigns these explicit elements
function fetchText(url) {
    return fetch(url, { 
        method: 'GET',
        headers: HEADERS 
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.text();
    });
}

module.exports = { fetchText, HEADERS };