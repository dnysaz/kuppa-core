/**
 * Kuppa Engine - Server Core
 * Optimized by Ketut Dana - High Performance Version
 * Standardized for The minimalist javascript supabase framework
 */

// 1. BOOTSTRAP: Load Autoloader & Environment First
require('../Autoload'); 
const path = require('path');
const rootDir = path.join(__dirname, '../../');
require('dotenv').config({ path: path.join(rootDir, '.env') });

// 2. CORE MODULES
const express      = require('express');
const hbs          = require('hbs');
const cookieParser = require('cookie-parser');
const os           = require('os');
const net          = require('net');
const compression  = require('compression');
const session      = require('express-session');

// 3. INTERNAL ENGINE HELPERS
const { registerHelpers } = coreFile('app.Helper');
const Engine              = coreFile('app.Engine');
const GlobalMiddleware    = coreFile('middleware.GlobalMiddleware');
const ExceptionHandler    = coreFile('middleware.ExceptionHandler');
const FlashMiddleware     = coreFile('middleware.FlashMiddleware');

const app = express();

/**
 * HIGH PERFORMANCE MIDDLEWARE
 * Optimization: Handle compression and static assets BEFORE session parsing
 */
app.use(compression());
// Added cache control for static assets to improve load speed
app.use(express.static(path.join(rootDir, 'public'), { maxAge: '1d' }));

// --- INITIALIZE VIEW HELPERS ---
registerHelpers();

// --- LIVERELOAD SETUP (Development Only) ---
if (process.env.APP_DEBUG === 'true') {
    const livereload        = require("livereload");
    const connectLiveReload = require("connect-livereload");
    const liveReloadServer  = livereload.createServer();
    liveReloadServer.watch(path.join(rootDir, 'views'));
    liveReloadServer.watch(path.join(rootDir, 'public'));
    app.use(connectLiveReload());
    liveReloadServer.server.once("connection", () => {
        setTimeout(() => liveReloadServer.refresh("/"), 100);
    });
}

// --- VIEW ENGINE CONFIGURATION ---
app.set('view engine', 'hbs');
app.set('views', [
    path.join(rootDir, 'views'),
    path.join(rootDir, 'core/views')
]);
app.set('view options', { layout: 'layouts/app' });

// Critical: View caching only for non-debug mode
if (process.env.APP_DEBUG !== 'true') app.enable('view cache');

hbs.registerPartials(path.join(rootDir, 'views/partials'));
hbs.registerPartials(path.join(rootDir, 'views/components')); 

// --- GLOBAL MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- MAINTENACE MODE ----

/**
 * MAINTENANCE MODE MIDDLEWARE
 * Blocks all routes and renders maintenance view if .maintenance file exists
 */
app.use((req, res, next) => {
    const fs = require('fs');
    const path = require('path');
    const maintenancePath = path.join(process.cwd(), '.maintenance');

    if (fs.existsSync(maintenancePath)) {
        const isAsset = req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
        if (isAsset) {
            return next();
        }

        try {
            const maintenanceInfo = JSON.parse(fs.readFileSync(maintenancePath, 'utf8'));
            res.status(503);
            return res.render('mode/maintenance', {
                layout: false, 
                message: maintenanceInfo.message,
                downAt: maintenanceInfo.down_at
            });
        } catch (err) {
            return res.status(503).send('<h1>Site Under Maintenance</h1>');
        }
    }
    next();
});

/**
 * SESSION MANAGEMENT
 * Required for Flash Messages to persist between redirects
 */
app.use((req, res, next) => {
    if (!process.env.APP_KEY) {
        const error = new Error('Security Breach: APP_KEY is missing in your .env file. Please run "kuppa key:generate" to secure your application.');
        error.status = 500;
        return next(error);
    }
    next();
});

app.use(require('express-session')({
    secret: process.env.APP_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.APP_STATUS === 'production', 
        maxAge: 3600000 
    }
}));

app.use(express.static(path.join(rootDir, 'public')));

/**
 * ENGINE CORE & FLASH INJECTION
 */
app.use(Engine);
app.use(coreFile('middleware.FlashMiddleware'));

/**
 * DATABASE & SYSTEM MIDDLEWARE
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
 */
const startServer = async () => {
    try {
        const port = parseInt(process.env.APP_PORT) || 3000;
        const localIp = getLocalIp();
        const isAvailable = await checkPort(port);

        if (!isAvailable) {
            console.log(`\n\x1b[31m[PORT CONFLICT] Port ${port} is in use.\x1b[0m`);
            process.exit(1);
        }

        const server = app.listen(port, () => {
            console.clear();
            console.log(`\x1b[32m🚀 Kuppa.JS is ready!\x1b[0m`);
            console.log(`----------------------------------------------`);
            console.log(`\x1b[36mLocal:\x1b[0m         http://localhost:${port}`);
            console.log(`\x1b[36mNetwork:\x1b[0m       http://${localIp}:${port}`);
            console.log(`----------------------------------------------`);
            console.log(`Environment:   \x1b[35m${process.env.APP_STATUS || 'development'}\x1b[0m`);
            console.log(`----------------------------------------------\n`);
        });

        server.on('error', (err) => {
            console.error(`\x1b[31m[Runtime Error]:\x1b[0m ${err.message}`);
            process.exit(1);
        });

    } catch (error) {
        console.error(`\x1b[31m[Boot Error]:\x1b[0m ${error.stack}`);
        process.exit(1);
    }
};

module.exports = { app, startServer };