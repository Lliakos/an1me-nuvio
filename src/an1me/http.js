const axios = require('axios');
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://an1me.to/"
};

async function fetchText(url) {
    const response = await axios.get(url, { headers: HEADERS });
    return response.data;
}

module.exports = { fetchText, HEADERS };