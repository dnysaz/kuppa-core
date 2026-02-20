/**
 * Kuppa Engine - Server Core
 * Optimized by Ketut Dana
 * Standardized for The minimalist javascript supabase framework
 */

// 1. BOOTSTRAP: Load Autoloader & Environment First
require('../Autoload'); 
const path = require('path');
const rootDir = path.join(__dirname, '../../');
require('dotenv').config({ path: path.join(rootDir, '.env') });

// 2. CORE MODULES
const express = require('express');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const os = require('os');
const net = require('net');

// 3. INTERNAL ENGINE HELPERS (Using coreFile)
const { registerHelpers } = coreFile('app.Helper');
const Engine = coreFile('app.Engine');
const GlobalMiddleware = coreFile('middleware.GlobalMiddleware');
const ExceptionHandler = coreFile('middleware.ExceptionHandler');

const app = express();

/**
 * HIGH PERFORMANCE MIDDLEWARE
 * Loaded immediately after app initialization to handle compression
 */
app.use(require('compression')());

// --- INITIALIZE VIEW HELPERS ---
registerHelpers();

// --- LIVERELOAD SETUP (Development Only) ---
if (process.env.APP_DEBUG === 'true') {
    const livereload = require("livereload");
    const connectLiveReload = require("connect-livereload");
    const liveReloadServer = livereload.createServer();
    liveReloadServer.watch(path.join(rootDir, 'views'));
    liveReloadServer.watch(path.join(rootDir, 'public'));
    app.use(connectLiveReload());
    liveReloadServer.server.once("connection", () => {
        setTimeout(() => liveReloadServer.refresh("/"), 100);
    });
}

// --- VIEW ENGINE CONFIGURATION ---
app.set('view engine', 'hbs');
app.set('views', path.join(rootDir, 'views'));
app.set('view options', { layout: 'layouts/app' });
if (process.env.APP_DEBUG !== 'true') app.enable('view cache');

// Registration of Partials and Components
hbs.registerPartials(path.join(rootDir, 'views/partials'));
hbs.registerPartials(path.join(rootDir, 'views/components')); 

// --- GLOBAL MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(rootDir, 'public')));

/**
 * ENGINE CORE INJECTION
 * Injecting fluent API (.with) and core response features
 */
app.use(Engine);

/**
 * DATABASE & SYSTEM MIDDLEWARE
 * Ensuring database connection and global locals are ready
 */
app.use(GlobalMiddleware);

// --- ROUTE REGISTRATION ---
app.use('/api', require(path.join(rootDir, 'routes/api')));
app.use('/', require(path.join(rootDir, 'routes/web')));

// --- 404 HANDLER ---
app.use((req, res, next) => {
    const err = new Error(`The path "${req.originalUrl}" was not found.`);
    err.status = 404;
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ status: 404, message: err.message });
    }
    next(err); 
});

// --- GLOBAL EXCEPTION HANDLER ---
app.use(ExceptionHandler); 

// --- NETWORK UTILITIES ---
/**
 * Get Local IPv4 Address
 * @returns {string}
 */
const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal) return alias.address;
        }
    }
    return '0.0.0.0';
};

/**
 * Port Availability Checker
 * @param {number} port 
 * @returns {Promise<boolean>}
 */
const checkPort = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
};

/**
 * KUPPA SERVER INITIALIZER
 * Strict Port Management: Ensures predictable environments and prevents zombie processes.
 */
const startServer = async () => {
    try {
        const port = parseInt(process.env.PORT) || 3000;
        const localIp = getLocalIp();

        // Validate port availability
        const isAvailable = await checkPort(port);

        if (!isAvailable) {
            console.clear();
            console.log('\x1b[31m%s\x1b[0m', '  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\x1b[31m\x1b[1m  [PORT CONFLICT] Port ' + port + ' is already in use!\x1b[0m');
            console.log('\x1b[31m%s\x1b[0m', '  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`\n  It looks like another process is already running on port \x1b[1m${port}\x1b[0m.`);
            console.log('  This usually happens when a previous session was not closed properly.');
            console.log('\n  \x1b[33m\x1b[1mQuick Solutions:\x1b[0m');
            console.log(`  1. Press \x1b[36mCtrl+C\x1b[0m in the terminal running the other process.`);
            console.log(`  2. Force kill the port: \x1b[36mnpx kill-port ${port}\x1b[0m`);
            console.log(`  3. Manually find the PID: \x1b[36mlsof -i :${port}\x1b[0m then \x1b[36mkill -9 [PID]\x1b[0m`);
            console.log('\x1b[31m%s\x1b[0m', '\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
            // Terminate process to prevent unhandled state
            process.exit(1);
        }

        const server = app.listen(port, () => {
            console.clear();
            console.log(`\x1b[32m🚀 Kuppa.JS is ready!\x1b[0m`);
            console.log(`----------------------------------------------`);
            console.log(`\x1b[36mLocal:\x1b[0m         http://localhost:${port}`);
            console.log(`\x1b[36mNetwork:\x1b[0m       http://${localIp}:${port}`);
            console.log(`----------------------------------------------`);
            console.log(`Environment:   \x1b[35m${process.env.APP_ENV || 'development'}\x1b[0m`);
            console.log(`Debug Mode:    \x1b[35m${process.env.APP_DEBUG || 'false'}\x1b[0m`);
            console.log(`----------------------------------------------`);
            console.log(`Hello Kuppa!`);
            console.log(`\x1b[2mPress Ctrl+C to stop the server\x1b[0m\n`);
        });

        // Handle runtime server errors
        server.on('error', (err) => {
            console.error(`\x1b[31m[Kuppa Runtime Error]:\x1b[0m ${err.message}`);
            process.exit(1);
        });

    } catch (error) {
        console.error(`\x1b[31m[Kuppa Boot Error]:\x1b[0m Failed to initialize server.`);
        console.error(error.stack);
        process.exit(1);
    }
};

module.exports = { app, startServer };