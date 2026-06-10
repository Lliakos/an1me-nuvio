const esbuild = require('esbuild');
const babel = require('@babel/core');
const path = require('path');
const fs = require('fs');

// ─── Argument Parsing ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
const transpileMode = args.includes('--transpile');
const minifyMode = args.includes('--minify');
const watchMode = args.includes('--watch');

const providerArgs = args.filter(a => !a.startsWith('--'));

// ─── Babel: async/await → generators (Hermes-safe) ──────────────────────────
function transpileForHermes(code) {
    const result = babel.transformSync(code, {
        plugins: [
            '@babel/plugin-transform-for-of',
            '@babel/plugin-transform-destructuring',
            '@babel/plugin-transform-parameters',
            '@babel/plugin-transform-spread',
            '@babel/plugin-transform-async-to-generator',
            '@babel/plugin-transform-regenerator',
        ],
        compact: minifyMode,
        assumptions: {
            ignoreFunctionLength: true,
        },
    });
    return result.code;
}

// ─── Build a single src/ provider ───────────────────────────────────────────
async function buildProvider(name) {
    const entryPoint = path.join(__dirname, 'src', name, 'index.js');
    const outfile     = path.join(__dirname, 'providers', `${name}.js`);

    if (!fs.existsSync(entryPoint)) {
        console.error(`❌  src/${name}/index.js not found`);
        return;
    }

    console.log(`\n🔨  Building: ${name}...`);

    // Step 1 — esbuild: bundle all imports into one IIFE
    await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        minify: false,   
        format: 'iife',
        globalName: 'provider',
        outfile,
        external: [],
    });

    let bundled = fs.readFileSync(outfile, 'utf8');
    console.log(`   ✔  Bundled  (${(bundled.length / 1024).toFixed(1)} KB)`);

    let transpiled = transpileForHermes(bundled);
    console.log(`   ✔  Transpiled async→generator`);

    if (minifyMode) {
        const minResult = await esbuild.transform(transpiled, { minify: true });
        transpiled = minResult.code;
        console.log(`   ✔  Minified  (${(transpiled.length / 1024).toFixed(1)} KB)`);
    }

    fs.writeFileSync(outfile, transpiled, 'utf8');
    console.log(`✅  providers/${name}.js ready`);
}

// ─── Transpile-only mode ────────────────────────────────────────────────────
async function transpileFile(nameOrPath) {
    let filePath = nameOrPath;
    if (!filePath.endsWith('.js')) filePath += '.js';
    if (!filePath.includes('/') && !filePath.includes('\\')) {
        filePath = path.join(__dirname, 'providers', filePath);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`❌  File not found: ${filePath}`);
        return;
    }

    console.log(`\n🔨  Transpiling: ${path.basename(filePath)}...`);
    const original = fs.readFileSync(filePath, 'utf8');

    if (!/async\s+(function|\(|[a-zA-Z])/.test(original) && !/await\s/.test(original)) {
        console.log('   ⏭️  No async/await detected — skipping.');
        return;
    }

    const transpiled = transpileForHermes(original);
    fs.writeFileSync(filePath, transpiled, 'utf8');
    console.log(`✅  ${path.basename(filePath)} transpiled in-place`);
}

async function transpileAll() {
    const providersDir = path.join(__dirname, 'providers');
    if (!fs.existsSync(providersDir)) {
        console.error('❌  providers/ directory not found');
        return;
    }
    const files = fs.readdirSync(providersDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
        await transpileFile(path.join(providersDir, f));
    }
}

// ─── Build all src/ providers ────────────────────────────────────────────────
async function buildAll() {
    const srcDir = path.join(__dirname, 'src');
    if (!fs.existsSync(srcDir)) {
        console.error('❌  src/ directory not found');
        process.exit(1);
    }
    const providers = fs.readdirSync(srcDir).filter(name => {
        if (name.startsWith('_')) return false;
        return fs.statSync(path.join(srcDir, name)).isDirectory();
    });
    for (const name of providers) {
        await buildProvider(name);
    }
}

// ─── Watch mode ─────────────────────────────────────────────────────────────
function startWatch(targets) {
    const chokidar = (() => {
        try { return require('chokidar'); } catch { return null; }
    })();

    if (!chokidar) {
        console.error('❌  Watch mode requires chokidar: npm install --save-dev chokidar');
        process.exit(1);
    }

    const srcDir = path.join(__dirname, 'src');
    const watchPaths = targets.length > 0 ? targets.map(t => path.join(srcDir, t)) : [srcDir];

    console.log('👁️  Watching for changes...');
    chokidar.watch(watchPaths, { ignoreInitial: true }).on('change', async (filePath) => {
        const parts = path.relative(srcDir, filePath).split(path.sep);
        const providerName = parts[0];
        if (!providerName) return;
        console.log(`\n📝  Changed: ${path.relative(__dirname, filePath)}`);
        await buildProvider(providerName).catch(console.error);
    });
}

// ─── Entry point ─────────────────────────────────────────────────────────────
(async () => {
    if (watchMode) {
        if (providerArgs.length > 0) {
            for (const name of providerArgs) await buildProvider(name);
        } else {
            await buildAll();
        }
        startWatch(providerArgs);
        return;
    }

    if (transpileMode) {
        if (providerArgs.length > 0) {
            for (const name of providerArgs) await transpileFile(name);
        } else {
            await transpileAll();
        }
        return;
    }

    if (providerArgs.length > 0) {
        for (const name of providerArgs) await buildProvider(name);
    } else {
        await buildAll();
    }
})();