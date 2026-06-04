# An1me.to — Nuvio Provider 🎌

Greek anime provider for the [Nuvio](https://nuvio.app) app, scraping content from [an1me.to](https://an1me.to).

## Install in Nuvio

1. Open Nuvio → **Settings → Plugins**
2. Add this repository URL:
   ```
   https://raw.githubusercontent.com/YOUR_USERNAME/an1me-nuvio/refs/heads/main/manifest.json
   ```
   *(replace `YOUR_USERNAME` with your GitHub username)*
3. Refresh and enable **An1me.to**

## How it works

1. Nuvio passes a **TMDB ID** → provider looks up the anime title via TMDB API
2. Searches **an1me.to** for that title
3. Finds the right episode URL
4. Extracts the stream (HLS / MP4 / embedded player)

## Files

```
an1me-nuvio/
├── providers/
│   └── an1me.js      ← The provider (ready to use, no build needed)
├── manifest.json     ← Provider registry
└── README.md
```

No build step required — the provider is already written with Promise chains
for full compatibility with Nuvio's Hermes JavaScript engine.
"# an1me-nuvio" 
