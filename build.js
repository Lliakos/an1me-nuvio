#!/usr/bin/env node

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, 'providers');

const EXTERNAL_MODULES = [
    'cheerio-without-node-native',
    'react-native-cheerio',
    'cheerio',
    'crypto-js',
    'axios'
];

function getProvidersToBuild() {
    const args = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
    if (args.length > 0) return args;
    if (!fs.existsSync(srcDir)) {
        console.error('❌ src directory not found.');
        process.exit(1);
    }
    return fs.readdirSync(srcDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
}

async function buildProvider(providerName, options = {}) {
    const providerDir = path.join(srcDir, providerName);
    const entryPoint = path.join(providerDir, 'index.js');
    const outFile = path.join(outDir, `${providerName}.js`);

    if (!fs.existsSync(entryPoint)) return false;

    try {
        await esbuild.build({
            entryPoints: [entryPoint],
            bundle: true,
            outfile: outFile,
            format: 'cjs',
            platform: 'neutral',
            target: 'es2016',
            minify: options.minify || false,
            external: EXTERNAL_MODULES,
            logLevel: 'warning'
        });
        console.log(`✅ Built ${providerName}.js`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to build ${providerName}`, err.message);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const shouldMinify = args.includes('--minify');
    const providers = getProvidersToBuild();
    
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    for (const provider of providers) {
        await buildProvider(provider, { minify: shouldMinify });
    }
}

main().catch(err => {
    console.error('Build failed', err);
    process.exit(1);
});