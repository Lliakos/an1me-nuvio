const esbuild = require('esbuild');
const path = require('path');

const providerName = process.argv[2];

if (!providerName) {
    console.error('❌ Please specify a provider name (e.g., node build.js an1me)');
    process.exit(1);
}

console.log(`Building provider: ${providerName}...`);

esbuild.build({
    entryPoints: [path.join(__dirname, 'src', providerName, 'index.js')],
    bundle: true,
    minify: false, 
    format: 'iife',
    globalName: 'provider',
    outfile: path.join(__dirname, 'providers', `${providerName}.js`),
    external: [] 
}).then(() => {
    console.log(`✅ Built ${providerName}.js successfully!`);
}).catch((err) => {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
});