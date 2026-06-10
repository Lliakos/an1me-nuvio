/**
 * An1me Provider — Debug Test Suite
 * 
 * Usage:
 *   node test.js                    → run all tests
 *   node test.js rezero             → run single test by name (partial match)
 *   node test.js --ep 5             → override episode number
 *   node test.js --dump-html        → save raw HTML to /tmp on failure
 *   node test.js rezero --ep 5 --dump-html
 */

const { getStreams } = require('./src/an1me/index.js');
const fs = require('fs');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dumpHtml  = args.includes('--dump-html');
const epArg     = args.includes('--ep') ? parseInt(args[args.indexOf('--ep') + 1], 10) : null;
const filterArg = args.filter(a => !a.startsWith('--') && isNaN(a)).join(' ').toLowerCase();

// ── Test cases ─────────────────────────────────────────────────────────────────

const TEST_CASES = [
    {
        name:  'Re:Zero',
        id:    '65123',
        extra: { title: 'Re:Zero - Starting Life in Another World', name: 'Re:Zero', originalTitle: 'Re:Zero kara Hajimeru Isekai Seikatsu' },
        note:  'Dict hit — slug was wrong before fix (rezero vs re-zero)',
    },
    {
        name:  'Naruto',
        id:    '2150',
        extra: { title: 'Naruto', name: 'Naruto', originalTitle: 'Naruto' },
        note:  'Dict hit — simple slug, good baseline test',
    },
    {
        name:  'Attack on Titan',
        id:    '1429',
        extra: { title: 'Attack on Titan', name: 'Attack on Titan', originalTitle: 'Shingeki no Kyojin' },
        note:  'Dict hit',
    },
    {
        name:  'Fullmetal Alchemist: Brotherhood',
        id:    '31911',
        extra: { title: 'Fullmetal Alchemist: Brotherhood', name: 'Fullmetal Alchemist: Brotherhood', originalTitle: 'Hagane no Renkinjutsushi: Fullmetal Alchemist' },
        note:  'Dict hit — colon in title, tests safeAtob edge cases',
    },
    {
        name:  'Unknown Anime (fallback search)',
        id:    '00000',
        extra: { title: 'Demon Slayer', name: 'Demon Slayer', originalTitle: 'Kimetsu no Yaiba' },
        note:  'Dict MISS — tests search fallback + slug detection',
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const WHITE  = '\x1b[37m';

function c(color, text) { return `${color}${text}${RESET}`; }
function hr(char = '─', len = 60) { return char.repeat(len); }
function pad(str, len) { return String(str).padEnd(len); }

function printStreamResult(stream, idx) {
    const label = stream.quality || stream.title || '(no label)';
    console.log(`\n    ${c(BOLD, `Stream ${idx + 1}: ${label}`)}`);
    if (stream.isM3U8 !== undefined) {
        console.log(`    ${c(DIM, 'isM3U8:  ')} ${stream.isM3U8}`);
    }

    if (stream.url) {
        const urlDisplay = stream.url.length > 90
            ? stream.url.slice(0, 87) + '...'
            : stream.url;
        console.log(`    ${c(DIM, 'URL:     ')} ${c(CYAN, urlDisplay)}`);

        // Detect URL type for quick diagnosis
        if (stream.url.includes('googlevideo.com')) {
            console.log(`    ${c(DIM, 'Type:    ')} ${c(YELLOW, 'Google Video (streaming)')}`);
        } else if (stream.url.includes('googleusercontent.com')) {
            console.log(`    ${c(DIM, 'Type:    ')} ${c(YELLOW, 'Google CDN (direct mp4)')}`);
        } else if (stream.url.includes('video-downloads')) {
            console.log(`    ${c(DIM, 'Type:    ')} ${c(YELLOW, 'Google Photos download CDN')}`);
        } else {
            console.log(`    ${c(DIM, 'Type:    ')} ${c(WHITE, 'Other')}`);
        }
    } else {
        console.log(`    ${c(RED, 'URL:      (missing!)')}`);
    }

    if (stream.headers) {
        const keys = Object.keys(stream.headers);
        console.log(`    ${c(DIM, 'Headers: ')} ${keys.join(', ')}`);
        if (stream.headers['Referer']) {
            // Warn if Referer is set for Google URLs — Google rejects these
            if (stream.url && stream.url.includes('google')) {
                console.log(`    ${c(RED, '⚠ WARNING: Referer header set for Google URL — this will likely cause 403!')}`);
            }
        }
    }
}

// Intercept console.log so we can capture provider logs separately
const PROVIDER_LOGS = [];
const origLog = console.log;
function captureStart() {
    console.log = (...a) => {
        const line = a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ');
        PROVIDER_LOGS.push(line);
    };
}
function captureEnd() {
    console.log = origLog;
}

// ── Run a single test ─────────────────────────────────────────────────────────

async function runTest(tc, episode) {
    PROVIDER_LOGS.length = 0;
    const ep = episode || 1;
    const startMs = Date.now();

    console.log(`\n${hr()}`);
    console.log(`${c(BOLD, `▶ ${tc.name}`)}  ${c(DIM, `TMDB ${tc.id} · S01E${String(ep).padStart(2,'0')}`)}`);
    console.log(`${c(DIM, tc.note)}`);
    console.log(hr('·'));

    let streams = [];
    let error = null;

    captureStart();
    try {
        const result = await getStreams(tc.id, 'tv', 1, ep, tc.extra);
        // Handle both bare array (old) and { streams: [] } (new Nuvio shape)
        origLog(c(DIM, '  RAW return: ' + JSON.stringify(result).slice(0, 200)));
        streams = Array.isArray(result) ? result : (result && result.streams ? result.streams : []);
    } catch (err) {
        error = err;
    }
    captureEnd();

    const elapsed = Date.now() - startMs;

    // Print provider logs indented
    for (const line of PROVIDER_LOGS) {
        origLog(`  ${c(DIM, line)}`);
    }

    origLog('');

    if (error) {
        origLog(c(RED, `  ✗ EXCEPTION: ${error.message}`));
        origLog(c(DIM, error.stack));
        return { name: tc.name, pass: false, streams: 0, elapsed };
    }

    if (streams.length === 0) {
        origLog(c(RED, `  ✗ FAIL — 0 streams returned (${elapsed}ms)`));

        // Dump HTML hint
        if (dumpHtml) {
            origLog(c(YELLOW, `  ℹ  Re-run without log capture to get raw HTML. Add fetch instrumentation in http.js.`));
        }

        // Common failure reasons
        origLog(`\n  ${c(YELLOW, 'Possible causes:')}`);
        const logs = PROVIDER_LOGS.join('\n');
        if (logs.includes('403') || logs.includes('Cloudflare') || logs.includes('short page')) {
            origLog(`    • ${c(RED, 'Cloudflare block')} — site returned 403. Provider needs a CF bypass cookie or puppeteer.`);
        }
        if (logs.includes('No kr-video')) {
            origLog(`    • ${c(YELLOW, 'Embed URL structure changed')} — an1me.to may have updated their embed format.`);
        }
        if (logs.includes('data-embed-id') && logs.includes(': 0')) {
            origLog(`    • ${c(YELLOW, 'No embeds on page')} — wrong slug or episode doesn't exist.`);
        }
        if (logs.includes('MP4 not resolved')) {
            origLog(`    • ${c(YELLOW, 'Google Photos MP4 not extractable')} — page structure may have changed, or bot detection triggered.`);
        }

        return { name: tc.name, pass: false, streams: 0, elapsed };
    }

    origLog(c(GREEN, `  ✓ PASS — ${streams.length} stream(s) found  (${elapsed}ms)`));
    streams.forEach((s, i) => printStreamResult(s, i));

    return { name: tc.name, pass: true, streams: streams.length, elapsed };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    let cases = TEST_CASES;

    if (filterArg) {
        cases = TEST_CASES.filter(tc => tc.name.toLowerCase().includes(filterArg));
        if (cases.length === 0) {
            console.log(c(RED, `No test cases match filter: "${filterArg}"`));
            console.log(`Available: ${TEST_CASES.map(t => t.name).join(', ')}`);
            process.exit(1);
        }
    }

    console.log(`\n${hr('═')}`);
    console.log(`  ${c(BOLD, 'An1me Provider — Test Suite')}`);
    console.log(`  ${c(DIM, `Running ${cases.length} test(s)${epArg ? `, episode ${epArg}` : ''}${dumpHtml ? ', --dump-html' : ''}`)}`);
    console.log(hr('═'));

    const results = [];
    for (const tc of cases) {
        const result = await runTest(tc, epArg);
        results.push(result);
    }

    // ── Summary table ────────────────────────────────────────────────────────

    const pass = results.filter(r => r.pass).length;
    const fail = results.filter(r => !r.pass).length;
    const totalStreams = results.reduce((s, r) => s + r.streams, 0);

    console.log(`\n${hr('═')}`);
    console.log(`  ${c(BOLD, 'Summary')}`);
    console.log(hr('─'));

    for (const r of results) {
        const icon    = r.pass ? c(GREEN, '✓') : c(RED, '✗');
        const streams = r.pass ? c(CYAN, `${r.streams} stream(s)`) : c(DIM, 'no streams');
        const time    = c(DIM, `${r.elapsed}ms`);
        console.log(`  ${icon}  ${pad(r.name, 38)} ${streams}  ${time}`);
    }

    console.log(hr('─'));

    const passLabel = pass > 0    ? c(GREEN, `${pass} passed`) : `${pass} passed`;
    const failLabel = fail > 0    ? c(RED,   `${fail} failed`) : `${fail} failed`;
    console.log(`  ${passLabel}   ${failLabel}   ${c(CYAN, `${totalStreams} total streams`)}`);
    console.log(hr('═') + '\n');

    process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
    console.error(c(RED, `Fatal: ${err.message}`));
    console.error(err.stack);
    process.exit(1);
});