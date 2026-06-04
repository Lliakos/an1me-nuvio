const axios = require('axios');

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://an1me.to/"
};

async function fetchText(url) {
    try {
        const response = await axios.get(url, { headers: HEADERS });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
}

module.exports = { fetchText, HEADERS };