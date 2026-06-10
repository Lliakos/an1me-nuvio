var provider = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = {
      exports: {}
    }).exports, mod), mod.exports;
  };

  // src/an1me/index.js
  var require_index = __commonJS({
    "src/an1me/index.js"(exports, module) {
      var AN1ME_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://an1me.to/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity"
      };
      var GOOGLE_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity"
      };
      var PLAYBACK_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity"
      };
      function fetchWithTimeout(url, headers, timeoutMs) {
        var ms = timeoutMs || 12e3;
        return Promise.race([fetch(url, {
          method: "GET",
          headers,
          redirect: "follow"
        }).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
          return res.text();
        }), new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error("Timeout after " + ms + "ms"));
          }, ms);
        })]);
      }
      function fetchAnime(url) {
        return fetchWithTimeout(url, AN1ME_HEADERS, 12e3);
      }
      function fetchGoogle(url) {
        return fetchWithTimeout(url, GOOGLE_HEADERS, 15e3);
      }
      function safeAtob(b64) {
        if (!b64) return "";
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var str = String(b64).replace(/\s/g, "").replace(/=+$/, "");
        var bc = 0,
          bs = 0,
          idx = 0,
          output = "";
        while (idx < str.length) {
          var ch = str.charAt(idx++);
          var pos = chars.indexOf(ch);
          if (pos === -1) continue;
          bs = bc % 4 ? bs * 64 + pos : pos;
          if (bc++ % 4) {
            output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
          }
        }
        return output;
      }
      function extractUrlAt(html, startIdx) {
        var url = "";
        for (var i = startIdx; i < html.length; i++) {
          var c = html[i];
          if (c === '"' || c === "'" || c === "\\" || c === "<" || c === ">" || c === " " || c === "\n" || c === "\r" || c === "	") break;
          url += c;
        }
        return url;
      }
      function resolveGooglePhotos(googleUrl) {
        console.log("[An1me] Resolving Google Photos: " + googleUrl.slice(0, 80));
        return fetchGoogle(googleUrl).then(function (html) {
          if (!html || html.length < 1e3) {
            console.log("[An1me] Google Photos: short/empty response (" + (html ? html.length : 0) + " bytes) \u2014 bot detection");
            return null;
          }
          console.log("[An1me] Google Photos: got " + html.length + " bytes");
          var VD = "https://video-downloads.googleusercontent.com/";
          var idx = html.indexOf(VD);
          if (idx !== -1) {
            var url = extractUrlAt(html, idx);
            if (url.length > VD.length + 10) {
              console.log("[An1me] Found video-downloads URL (raw)");
              return url;
            }
          }
          var decoded = html.replace(/\\u002F/gi, "/").replace(/\\u0026/gi, "&").replace(/\\u003[dD]/g, "=").replace(/\\u003[aA]/g, ":").replace(/\\u0025/gi, "%");
          idx = decoded.indexOf(VD);
          if (idx !== -1) {
            var url2 = extractUrlAt(decoded, idx);
            if (url2.length > VD.length + 10) {
              console.log("[An1me] Found video-downloads URL (decoded)");
              return url2;
            }
          }
          var gvMatch = decoded.match(/https:\/\/[a-z0-9\-]+\.googlevideo\.com\/videoplayback[^"'\s\\<>]+/i);
          if (gvMatch) {
            console.log("[An1me] Found googlevideo URL");
            return gvMatch[0];
          }
          var gcMatch = decoded.match(/https:\/\/[a-z0-9\-]+\.googleusercontent\.com\/[A-Za-z0-9_\-]{80,}/);
          if (gcMatch) {
            console.log("[An1me] Found long googleusercontent URL");
            return gcMatch[0];
          }
          console.log("[An1me] Google Photos: no video URL found in page");
          return null;
        }).catch(function (err) {
          console.log("[An1me] Google Photos fetch error: " + err.message);
          return null;
        });
      }
      function parseEmbeds(html) {
        var results = [];
        var re = /data-embed-id=["']([^"']+)["']/g;
        var m;
        while ((m = re.exec(html)) !== null) {
          results.push(m[1]);
        }
        return results;
      }
      function processEmbed(data) {
        try {
          var colonIdx = data.indexOf(":");
          if (colonIdx === -1) return null;
          var serverName = safeAtob(data.slice(0, colonIdx)).trim();
          var iframeHtml = safeAtob(data.slice(colonIdx + 1));
          var srcMatch = iframeHtml.match(/src=["']([^"']+)["']/);
          if (!srcMatch) return null;
          var krMatch = srcMatch[1].match(/kr-video\/([A-Za-z0-9+\/=_\-]+)/);
          if (!krMatch) return null;
          var decodedLink = safeAtob(krMatch[1]);
          if (!decodedLink || decodedLink.length < 10) return null;
          return {
            serverName,
            link: decodedLink
          };
        } catch (e) {
          return null;
        }
      }
      function extractStreams(slug, episode) {
        var ep = parseInt(episode, 10) || 1;
        var url = "https://an1me.to/watch/" + slug + "-episode-" + ep + "/";
        console.log("[An1me] Fetching: " + url);
        return fetchAnime(url).then(function (html) {
          console.log("[An1me] Page: " + html.length + " bytes");
          if (html.length < 1e3) {
            console.log("[An1me] WARNING: Very short page \u2014 likely Cloudflare block");
            return [];
          }
          var embeds = parseEmbeds(html);
          console.log("[An1me] Found " + embeds.length + " embed(s)");
          var promises = embeds.map(function (data) {
            var parsed = processEmbed(data);
            if (!parsed) return Promise.resolve(null);
            var isGoogle = parsed.link.includes("photos.google.com") || parsed.link.includes("photos.app.goo.gl") || parsed.link.includes("googleusercontent.com");
            if (isGoogle) {
              return resolveGooglePhotos(parsed.link).then(function (playableUrl) {
                if (!playableUrl) {
                  console.log('[An1me] Dropping "' + parsed.serverName + '" \u2014 could not resolve Google URL');
                  return null;
                }
                return {
                  name: "An1me - " + (parsed.serverName || "Auto"),
                  title: "An1me " + (parsed.serverName || "Auto"),
                  url: playableUrl,
                  quality: parsed.serverName || "Auto",
                  isM3U8: false,
                  headers: {
                    "User-Agent": PLAYBACK_HEADERS["User-Agent"],
                    "Accept": PLAYBACK_HEADERS["Accept"],
                    "Accept-Language": PLAYBACK_HEADERS["Accept-Language"]
                  }
                };
              });
            } else {
              var isHls = parsed.link.indexOf(".m3u8") !== -1;
              return Promise.resolve({
                name: "An1me - " + (parsed.serverName || "Auto"),
                title: "An1me " + (parsed.serverName || "Auto"),
                url: parsed.link,
                quality: parsed.serverName || "Auto",
                isM3U8: isHls,
                headers: {
                  "User-Agent": AN1ME_HEADERS["User-Agent"],
                  "Referer": AN1ME_HEADERS["Referer"],
                  "Accept": AN1ME_HEADERS["Accept"],
                  "Accept-Language": AN1ME_HEADERS["Accept-Language"]
                }
              });
            }
          });
          return Promise.all(promises).then(function (results) {
            return results.filter(Boolean);
          });
        }).catch(function (err) {
          console.log("[An1me] Page fetch error: " + err.message);
          return [];
        });
      }
      var SLUG_MAP = {
        "65123": "rezero-kara-hajimeru-isekai-seikatsu",
        "1429": "shingeki-no-kyojin",
        "2150": "naruto",
        "31911": "fullmetal-alchemist-brotherhood"
      };
      function slugify(text) {
        return text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-");
      }
      function searchAnimeSlug(titleOrExtra) {
        var titles = [];
        if (typeof titleOrExtra === "object" && titleOrExtra !== null) {
          if (titleOrExtra.title) titles.push(titleOrExtra.title);
          if (titleOrExtra.name) titles.push(titleOrExtra.name);
          if (titleOrExtra.originalTitle) titles.push(titleOrExtra.originalTitle);
        } else if (typeof titleOrExtra === "string") {
          titles.push(titleOrExtra);
        }
        var queries = titles.map(function (t) {
          return t.replace(/(Season|Part)\s*\d+/ig, "").trim();
        }).filter(function (t, i, a) {
          return t && a.indexOf(t) === i;
        });
        function tryNext(i) {
          if (i >= queries.length) {
            var fb = slugify(titles[0] || "anime");
            console.log("[An1me] Search exhausted, using slugified fallback: " + fb);
            return Promise.resolve(fb);
          }
          var baseTitle = queries[i];
          var searchUrl = "https://an1me.to/?s=" + encodeURIComponent(baseTitle);
          console.log("[An1me] Searching: " + searchUrl);
          return fetchAnime(searchUrl).then(function (html) {
            var hrefRe = /href=["']([^"']+)["']/g;
            var m;
            var found = null;
            var titleWords = baseTitle.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) {
              return w.length > 2;
            });
            while ((m = hrefRe.exec(html)) !== null && !found) {
              var href = m[1];
              if (!href || href === "#" || href === "/" || href.includes("javascript:")) continue;
              if (href.includes("?") || href.includes("/category/") || href.includes("/genre/") || href.includes("/tag/")) continue;
              var clean = href.replace("https://an1me.to", "").trim();
              var segs = clean.split("/").filter(Boolean);
              if (!segs.length) continue;
              var candidate = segs[segs.length - 1];
              if (candidate.includes("episode-")) candidate = candidate.replace(/-episode-\d+/i, "");
              if (!/^[a-z0-9\-]+$/i.test(candidate)) continue;
              var valid = titleWords.length > 0 ? titleWords.some(function (w) {
                return candidate.toLowerCase().includes(w);
              }) : candidate.toLowerCase().includes(baseTitle.toLowerCase().replace(/[^a-z0-9]/g, ""));
              if (valid) found = candidate;
            }
            if (found) {
              console.log("[An1me] Search found: " + found);
              return found;
            }
            return tryNext(i + 1);
          }).catch(function () {
            return tryNext(i + 1);
          });
        }
        return tryNext(0);
      }
      function getStreams(tmdbId, mediaType, season, episode, extra) {
        var targetId = "";
        if (tmdbId !== null && tmdbId !== void 0) {
          targetId = String(tmdbId).trim().replace(/^tmdb:/i, "").split(".")[0];
        }
        console.log('[An1me] TMDB ID: "' + targetId + '"');
        function wrapStreams(arr) {
          return {
            streams: arr
          };
        }
        function doSearch(extraInfo) {
          return searchAnimeSlug(extraInfo || targetId).then(function (slug2) {
            if (!slug2) return wrapStreams([]);
            return extractStreams(slug2, episode).then(wrapStreams);
          });
        }
        if (targetId && SLUG_MAP[targetId]) {
          var slug = SLUG_MAP[targetId];
          console.log("[An1me] Dict hit: " + slug);
          return extractStreams(slug, episode).then(wrapStreams);
        }
        console.log("[An1me] Dict miss \u2014 searching...");
        if (extra && (extra.title || extra.name)) {
          return doSearch(extra);
        }
        if (targetId && targetId !== "0" && targetId !== "00000") {
          var type = mediaType === "movie" ? "movie" : "tv";
          var tmdbUrl = "https://api.themoviedb.org/3/" + type + "/" + targetId + "?api_key=1865f43a0549ca50d341dd9ab8b29f49";
          console.log("[An1me] Fetching TMDB title for ID: " + targetId);
          return fetchWithTimeout(tmdbUrl, GOOGLE_HEADERS, 8e3).then(function (text) {
            try {
              var info = JSON.parse(text);
              var title = info.name || info.title || info.original_name || info.original_title;
              if (title) {
                console.log("[An1me] TMDB title: " + title);
                return doSearch({
                  title,
                  name: title,
                  originalTitle: info.original_name || info.original_title
                });
              }
            } catch (e) {
              console.log("[An1me] TMDB parse error: " + e.message);
            }
            return doSearch(null);
          }).catch(function (err) {
            console.log("[An1me] TMDB fetch error: " + err.message);
            return doSearch(null);
          });
        }
        return doSearch(null);
      }
      module.exports = {
        getStreams
      };
      if (typeof global !== "undefined") global.getStreams = getStreams;
      if (typeof window !== "undefined") window.getStreams = getStreams;
    }
  });
  return require_index();
})();
;
if (typeof provider !== "undefined" && provider.getStreams) {
  var getStreams = provider.getStreams;
}