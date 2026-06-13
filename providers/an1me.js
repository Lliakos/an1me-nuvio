(function () {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = function (cb, mod) {
    return function __require() {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = {
        exports: {}
      }).exports, mod), mod.exports;
    };
  };

  // src/an1me/index.js
  var require_index = __commonJS({
    "src/an1me/index.js": function (exports, module) {
      var DEBUG = false;
      var LOG_URL = "http://192.168.2.15:3000/log";
      function remoteLog(msg) {
        if (!DEBUG) return;
        try {
          var p = fetch(LOG_URL, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain"
            },
            body: msg
          });
          if (p && typeof p.catch === "function") {
            p.catch(function () {});
          }
        } catch (e) {}
      }
      var AN1ME_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://an1me.to/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      };
      var SLUG_MAP = {
        // Re:Zero (65942) — S2 is split on an1me.to at ep13
        "65942": {
          "1": "rezero-kara-hajimeru-isekai-seikatsu",
          "2": {
            slug: "rezero-kara-hajimeru-isekai-seikatsu-2nd-season",
            splitAfter: 13,
            next: {
              slug: "rezero-kara-hajimeru-isekai-seikatsu-2nd-season-part-2",
              offset: 13
            }
          },
          "3": "rezero-kara-hajimeru-isekai-seikatsu-3rd-season",
          "4": "rezero-kara-hajimeru-isekai-seikatsu-4th-season",
          "*": "rezero-kara-hajimeru-isekai-seikatsu"
        },
        "65123": "rezero-kara-hajimeru-isekai-seikatsu",
        // Frieren (209867) — Japanese title on an1me.to
        "209867": "sousou-no-frieren",
        // That Time I Got Reincarnated as a Slime (82684)
        // TMDB keeps all seasons under one show ID
        // an1me.to splits them into separate slugs per season/part
        "82684": {
          "1": "tensei-shitara-slime-datta-ken",
          "2": {
            slug: "tensei-shitara-slime-datta-ken-2nd-season",
            splitAfter: 12,
            next: {
              slug: "tensei-shitara-slime-datta-ken-2nd-season-part-2",
              offset: 12
            }
          },
          "3": "tensei-shitara-slime-datta-ken-3rd-season",
          "4": "tensei-shitara-slime-datta-ken-4th-season",
          "*": "tensei-shitara-slime-datta-ken"
        },
        // Black Clover (73223) — English title on an1me.to
        "73223": "black-clover",
        // Attack on Titan (1429)
        "1429": "shingeki-no-kyojin",
        // Naruto (46260)
        "46260": "naruto",
        // FMA Brotherhood (31911)
        "31911": "fullmetal-alchemist-brotherhood",
        // Bleach (30984)
        "30984": "bleach",
        // Dragon Ball Z (46298)
        "46298": "dragon-ball-z",
        // One Piece (37854)
        "37854": "one-piece",
        // Death Note (13916)
        "13916": "death-note",
        // Jujutsu Kaisen (71725)
        "71725": "jujutsu-kaisen",
        // Demon Slayer (85937)
        "85937": "demon-slayer-kimetsu-no-yaiba"
      };
      function resolveSlugAndEp(targetId, season, episode) {
        var entry = SLUG_MAP[targetId];
        if (!entry) return null;
        var seasonEntry;
        if (typeof entry === "string") {
          seasonEntry = entry;
        } else {
          var s = String(season || 1);
          seasonEntry = entry[s] || entry["*"] || entry["1"];
        }
        if (!seasonEntry) return null;
        if (typeof seasonEntry === "string") return {
          slug: seasonEntry,
          episode: episode
        };
        var ep = parseInt(episode, 10) || 1;
        if (seasonEntry.splitAfter && ep > seasonEntry.splitAfter && seasonEntry.next) {
          var adj = ep - seasonEntry.next.offset;
          remoteLog("[An1me] Split: ep " + ep + " -> " + seasonEntry.next.slug + " ep " + adj);
          return {
            slug: seasonEntry.next.slug,
            episode: adj
          };
        }
        return {
          slug: seasonEntry.slug,
          episode: ep
        };
      }
      function plainFetch(url, headers) {
        return fetch(url, {
          method: "GET",
          headers: headers,
          redirect: "follow"
        }).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
          return res.text();
        });
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
      function inferType(url) {
        if (!url) return null;
        var u = url.toLowerCase();
        if (u.indexOf(".m3u8") !== -1 || u.indexOf("/hls/") !== -1) return "hls";
        return "mp4";
      }
      function parseEmbeds(html) {
        var results = [];
        var re = /data-embed-id=["']([^"']+)["']/g;
        var m;
        while ((m = re.exec(html)) !== null) results.push(m[1]);
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
          var iframeSrc = srcMatch[1];
          var krVideoUrl = iframeSrc.indexOf("http") === 0 ? iframeSrc : "https://an1me.to" + (iframeSrc.charAt(0) === "/" ? "" : "/") + iframeSrc;
          var krMatch = iframeSrc.match(/kr-video\/([A-Za-z0-9+\/=_\-]+)/);
          var directUrl = krMatch ? safeAtob(krMatch[1]) : "";
          var isGoogle = directUrl.indexOf("photos.google.com") !== -1 || directUrl.indexOf("photos.app.goo.gl") !== -1;
          return {
            serverName: serverName,
            krVideoUrl: krVideoUrl,
            directUrl: directUrl,
            isGoogle: isGoogle
          };
        } catch (e) {
          return null;
        }
      }
      function extractParamsSources(html) {
        var MARKER = "const params = ";
        var start = html.indexOf(MARKER);
        if (start === -1) return null;
        start += MARKER.length;
        var depth = 0,
          end = -1;
        for (var i = start; i < html.length; i++) {
          if (html[i] === "{") depth++;else if (html[i] === "}") {
            depth--;
            if (depth === 0) {
              end = i + 1;
              break;
            }
          }
        }
        if (end === -1) return null;
        try {
          var jsonStr = html.slice(start, end).split("\\/").join("/");
          var params = JSON.parse(jsonStr);
          if (params.sources && params.sources.length > 0) return params.sources;
        } catch (e) {
          remoteLog("[An1me] params JSON parse error: " + e.message);
        }
        return null;
      }
      function resolveViaKrVideoPage(krVideoUrl, serverName) {
        remoteLog("[An1me] Fetching kr-video page for: " + serverName);
        return plainFetch(krVideoUrl, AN1ME_HEADERS).then(function (html) {
          remoteLog("[An1me] kr-video page: " + html.length + " bytes");
          var sources = extractParamsSources(html);
          if (!sources) {
            remoteLog("[An1me] kr-video: no sources");
            return [];
          }
          remoteLog("[An1me] kr-video: found " + sources.length + " source(s)");
          var streams = [];
          for (var i = 0; i < sources.length; i++) {
            var src = sources[i];
            if (!src.url) continue;
            var label = src.html || "Quality " + (i + 1);
            streams.push({
              name: "An1me - " + serverName + " " + label,
              title: "An1me " + serverName + " " + label,
              url: src.url,
              quality: label,
              type: inferType(src.url)
              // No Referer — lh3 rejects non-Google referrers
            });
          }
          return streams;
        }).catch(function (err) {
          remoteLog("[An1me] kr-video error: " + err.message);
          return [];
        });
      }
      function extractStreams(slug, episode) {
        var ep = parseInt(episode, 10) || 1;
        var url = "https://an1me.to/watch/" + slug + "-episode-" + ep + "/";
        remoteLog("[An1me] Fetching: " + url);
        return plainFetch(url, AN1ME_HEADERS).then(function (html) {
          remoteLog("[An1me] Page: " + html.length + " bytes");
          if (html.length < 1e3) {
            remoteLog("[An1me] WARNING: Short page");
            return [];
          }
          var embeds = parseEmbeds(html);
          remoteLog("[An1me] Found " + embeds.length + " embed(s)");
          var promises = embeds.map(function (data, i) {
            var parsed = processEmbed(data);
            if (!parsed || !parsed.directUrl) return Promise.resolve([]);
            remoteLog("[An1me] Embed[" + i + "]: " + parsed.serverName + " google=" + parsed.isGoogle);
            if (!parsed.isGoogle) {
              var t = inferType(parsed.directUrl);
              return Promise.resolve([{
                name: "An1me - " + parsed.serverName,
                title: "An1me " + parsed.serverName,
                url: parsed.directUrl,
                quality: "HD",
                type: t,
                headers: {
                  "User-Agent": AN1ME_HEADERS["User-Agent"],
                  "Referer": "https://an1me.to/",
                  "Origin": "https://an1me.to"
                }
              }]);
            } else {
              return resolveViaKrVideoPage(parsed.krVideoUrl, parsed.serverName);
            }
          });
          return Promise.all(promises).then(function (results) {
            var out = [];
            for (var i = 0; i < results.length; i++) {
              var r = results[i];
              if (Array.isArray(r)) for (var j = 0; j < r.length; j++) out.push(r[j]);else if (r) out.push(r);
            }
            remoteLog("[An1me] Returning " + out.length + " stream(s)");
            return out;
          });
        }).catch(function (err) {
          remoteLog("[An1me] Page fetch error: " + err.message);
          return [];
        });
      }
      function slugify(text) {
        return text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-");
      }
      function searchForSlug(title) {
        var searchUrl = "https://an1me.to/?s=" + encodeURIComponent(title);
        remoteLog("[An1me] Searching: " + searchUrl);
        return plainFetch(searchUrl, AN1ME_HEADERS).then(function (html) {
          var hrefRe = /href=["']([^"']+)["']/g;
          var m;
          var titleWords = title.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) {
            return w.length > 2;
          });
          var found = null;
          while ((m = hrefRe.exec(html)) !== null && !found) {
            var href = m[1];
            if (!href || href === "#" || href === "/" || href.indexOf("javascript:") !== -1 || href.indexOf("?") !== -1) continue;
            var clean = href.replace("https://an1me.to", "").trim();
            var animeMatch = clean.match(/^\/anime\/([a-z0-9\-]+)\/?$/i);
            var watchMatch = clean.match(/^\/watch\/([a-z0-9\-]+)-episode-\d+\/?$/i);
            var candidate = animeMatch ? animeMatch[1] : watchMatch ? watchMatch[1] : null;
            if (!candidate) continue;
            for (var wi = 0; wi < titleWords.length; wi++) {
              if (candidate.toLowerCase().indexOf(titleWords[wi]) !== -1) {
                found = candidate;
                break;
              }
            }
          }
          return found || null;
        }).catch(function () {
          return null;
        });
      }
      function searchAnimeSlug(info) {
        var english = info && (info.title || info.name) || "";
        var original = info && info.originalTitle || "";
        var queries = [];
        if (english) queries.push(english);
        if (original && original !== english) queries.push(original);
        var cleaned = english.replace(/:\s*.+$/, "").replace(/(Season|Part)\s*\d+/ig, "").trim();
        if (cleaned && cleaned !== english && queries.indexOf(cleaned) === -1) queries.push(cleaned);
        function tryNext(i) {
          if (i >= queries.length) {
            var fb = slugify(english || original || "anime");
            remoteLog("[An1me] Search exhausted, fallback slug: " + fb);
            return Promise.resolve(fb);
          }
          return searchForSlug(queries[i]).then(function (found) {
            if (found) {
              remoteLog('[An1me] Search hit "' + queries[i] + '" -> ' + found);
              return found;
            }
            remoteLog("[An1me] Search miss: " + queries[i]);
            return tryNext(i + 1);
          });
        }
        return tryNext(0);
      }
      function extractStreamsWithFallback(slug, episode) {
        return extractStreams(slug, episode).then(function (streams) {
          if (streams && streams.length > 0) return streams;
          var cleanSlug = slug.replace(/-+$/, "").replace(/--+/g, "-");
          if (cleanSlug !== slug) {
            remoteLog("[An1me] Retrying with cleaned slug: " + cleanSlug);
            return extractStreams(cleanSlug, episode);
          }
          return streams;
        });
      }
      function getStreams(tmdbId, mediaType, season, episode) {
        remoteLog("[An1me] getStreams called | id=" + tmdbId + " type=" + mediaType + " s=" + season + " ep=" + episode);
        var targetId = "";
        if (tmdbId !== null && tmdbId !== void 0) {
          targetId = String(tmdbId).trim().replace(/^tmdb:/i, "").split(".")[0];
        }
        remoteLog('[An1me] TMDB ID: "' + targetId + '"');
        var resolved = resolveSlugAndEp(targetId, season, episode);
        if (resolved) {
          remoteLog("[An1me] Dict hit: " + resolved.slug + " ep=" + resolved.episode + " (s=" + season + ")");
          return extractStreamsWithFallback(resolved.slug, resolved.episode);
        }
        remoteLog("[An1me] Dict miss - fetching TMDB metadata...");
        if (targetId && targetId !== "0") {
          var mtype = mediaType === "movie" ? "movie" : "tv";
          var tmdbUrl = "https://api.themoviedb.org/3/" + mtype + "/" + targetId + "?api_key=1865f43a0549ca50d341dd9ab8b29f49";
          return fetch(tmdbUrl, {
            method: "GET",
            headers: AN1ME_HEADERS,
            redirect: "follow"
          }).then(function (res) {
            return res.text();
          }).then(function (text) {
            var info = {
              title: "",
              originalTitle: ""
            };
            try {
              var data = JSON.parse(text);
              info.title = data.name || data.title || "";
              info.originalTitle = data.original_name || data.original_title || "";
              remoteLog('[An1me] TMDB: title="' + info.title + '" original="' + info.originalTitle + '"');
            } catch (e) {
              remoteLog("[An1me] TMDB parse error: " + e.message);
            }
            if (!info.title && !info.originalTitle) return [];
            return searchAnimeSlug(info).then(function (slug) {
              return slug ? extractStreamsWithFallback(slug, episode) : [];
            });
          }).catch(function (err) {
            remoteLog("[An1me] TMDB fetch error: " + err.message);
            return [];
          });
        }
        return Promise.resolve([]);
      }
      if (typeof module !== "undefined" && module.exports) {
        module.exports = {
          getStreams: getStreams
        };
      }
      if (typeof global !== "undefined") {
        global.getStreams = getStreams;
      }
      if (typeof window !== "undefined") {
        window.getStreams = getStreams;
      }
      if (typeof self !== "undefined") {
        self.getStreams = getStreams;
      }
    }
  });
  require_index();
})();