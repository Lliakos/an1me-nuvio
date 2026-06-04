const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://an1me.to/"
};

async function fetchText(url) {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    return await response.text();
}

module.exports = { fetchText, HEADERS };