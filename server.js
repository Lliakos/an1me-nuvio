const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
// Target path for the physical log file
const LOG_FILE_PATH = path.join(__dirname, 'phone.log');

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const mimeTypes = {
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.html': 'text/html',
};

const server = http.createServer((req, res) => {
    // 1. Handle CORS (Added POST to allowed methods)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 2. Intercept remote logs from your phone and save them to a disk file
    if (req.method === 'POST' && req.url === '/log') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            // Live console output
            console.log(`📱 [PHONE LOG]: ${body}`);
            
            // Append log string to the physical file with a clean timestamp
            try {
                const timestamp = new Date().toLocaleString();
                fs.appendFileSync(LOG_FILE_PATH, `[${timestamp}] ${body}\n`, 'utf8');
            } catch (writeErr) {
                console.error(`❌ Failed writing to physical log file: ${writeErr.message}`);
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('ok');
        });
        return;
    }

    console.log(`${req.method} ${req.url}`);

    // Prepare file path
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    // Security check: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov'];

    const extname = path.extname(filePath);
    let contentType = mimeTypes[extname] || 'application/octet-stream';
    if (videoExtensions.includes(extname)) {
        contentType = "video/mp4"; 
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                if (req.url === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Nuvio Providers Server Running. Access /manifest.json to see the manifest.');
                    return;
                }
                res.writeHead(404);
                res.end(`File not found: ${req.url}`);
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    const ip = getLocalIp();
    
    // CHANGE: Force create/clear the file on startup so it immediately exists on your desktop
    try {
        const startupTime = new Date().toLocaleString();
        fs.writeFileSync(LOG_FILE_PATH, `=== LOG SESSION STARTED AT ${startupTime} ===\n`, 'utf8');
    } catch (err) {
        console.error(`❌ Could not create initial log file: ${err.message}`);
    }

    console.log(`\n🚀 Debug Server running at: http://${ip}:${PORT}/`);
    console.log(`  Manifest URL:      http://${ip}:${PORT}/manifest.json`);
    console.log(`📡 Log Listener active at: http://${ip}:${PORT}/log`);
    console.log(`📁 Saving physical logs to:  ${LOG_FILE_PATH}`);
    console.log('Press Ctrl+C to stop and exit\n');
});