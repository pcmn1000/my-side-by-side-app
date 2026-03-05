#!/usr/bin/env node
/**
 * BTP Agentation CLI
 *
 * Usage:
 *   npx btp-agentation
 *   npx btp-agentation --script-tag
 *   npx btp-agentation --bookmarklet
 *   npx btp-agentation --console
 *   npx btp-agentation --url
 *   npx btp-agentation --serve [port]
 */

const path = require('path');
const fs = require('fs');
const btp = require('../index.js');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const args = process.argv.slice(2);

function showHelp() {
    console.log('');
    console.log(BOLD + CYAN + '  BTP Agentation v5.0' + RESET);
    console.log(DIM + '  SAP BTP / Fiori Elements Visual Feedback Tool' + RESET);
    console.log('');
    console.log(YELLOW + '  Usage:' + RESET);
    console.log('  ' + CYAN + 'npx btp-agentation --script-tag' + RESET + '  Output <script> tag');
    console.log('  ' + CYAN + 'npx btp-agentation --bookmarklet' + RESET + '  Output bookmarklet code');
    console.log('  ' + CYAN + 'npx btp-agentation --console' + RESET + '     Output DevTools console snippet');
    console.log('  ' + CYAN + 'npx btp-agentation --url' + RESET + '         Output CDN URL');
    console.log('  ' + CYAN + 'npx btp-agentation --serve [port]' + RESET + ' Start local server (default: 3939)');
    console.log('');
    console.log(DIM + '  Homepage: https://pcmn1000.github.io/my-side-by-side-app/' + RESET);
    console.log('');
}

if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

if (args.includes('--script-tag')) {
    console.log(btp.getScriptTag());
    process.exit(0);
}

if (args.includes('--bookmarklet')) {
    console.log(btp.getBookmarklet());
    process.exit(0);
}

if (args.includes('--console')) {
    console.log(btp.getConsoleSnippet());
    process.exit(0);
}

if (args.includes('--url')) {
    console.log(btp.getCdnUrl());
    process.exit(0);
}

if (args.includes('--serve')) {
    const portIdx = args.indexOf('--serve') + 1;
    const port = (portIdx < args.length && !args[portIdx].startsWith('-'))
        ? parseInt(args[portIdx], 10) : 3939;

    const http = require('http');
    const scriptContent = btp.getScript();

    const server = http.createServer(function(req, res) {
        if (req.url === '/' || req.url === '/btp-agentation.js') {
            res.writeHead(200, {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            });
            res.end(scriptContent);
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(port, function() {
        console.log('');
        console.log(BOLD + GREEN + '  BTP Agentation local server running!' + RESET);
        console.log('');
        console.log('  URL:         ' + CYAN + 'http://localhost:' + port + '/btp-agentation.js' + RESET);
        console.log('  Script tag:  ' + DIM + '<script src="http://localhost:' + port + '/btp-agentation.js"></script>' + RESET);
        console.log('');
        console.log(DIM + '  Press Ctrl+C to stop' + RESET);
        console.log('');
    });
    return;
}

// Default: show help
showHelp();
