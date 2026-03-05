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
const FlashMiddleware     = coreFile('middleware.FlashMiddleware');
const GlobalMiddleware    = coreFile('middleware.GlobalMiddleware');
const Logger              = coreFile('utils.Logger');
const LogMiddleware       = coreFile('middleware.LogMiddleware');
const ExceptionHandler    = coreFile('middleware.ExceptionHandler');

const app = express();

const cors = require('cors');

const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) 
    : []; 

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

/**
 * HIGH PERFORMANCE MIDDLEWARE
 * Optimization: Handle compression and static assets BEFORE session parsing
 */
app.use(compression());
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

if (process.env.APP_DEBUG !== 'true') app.enable('view cache');

hbs.registerPartials(path.join(rootDir, 'views/partials'));
hbs.registerPartials(path.join(rootDir, 'views/components')); 

// --- GLOBAL MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * SESSION MANAGEMENT
 */
app.use((req, res, next) => {
    if (!process.env.APP_KEY) {
        const error = new Error('Security Breach: APP_KEY is missing. Run "node kuppa key:generate".');
        error.status = 500;
        return next(error);
    }
    next();
});

app.use(session({
    secret: process.env.APP_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.APP_STATUS === 'production', 
        maxAge: 3600000 
    }
}));

// ---- MAINTENANCE MODE ----
app.use((req, res, next) => {
    const fs = require('fs');
    const maintenancePath = path.join(process.cwd(), '.maintenance');

    if (fs.existsSync(maintenancePath)) {
        const isAsset = req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
        if (isAsset) return next();

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

// --- ROUTE REGISTRATION ---

// 1. API - Dipasang secara eksklusif di /api
app.use('/api', require(path.join(rootDir, 'routes/api')));

// 2. WEB - Dibuat router khusus, dan DIPAKSA untuk tidak menangani /api
const webRouter = express.Router();

// Middleware Web (Hanya untuk Web)
webRouter.use(Engine);
webRouter.use(FlashMiddleware);
webRouter.use(GlobalMiddleware);
webRouter.use(LogMiddleware);

// Rute Web
webRouter.use('/', require(path.join(rootDir, 'routes/web')));

// 3. DAFTARKAN WEB ROUTER DENGAN PATH YANG BENAR
app.use('/', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return next();
    }
    webRouter(req, res, next);
});

/**
 * Global Abort Helper
 */
global.abort = (code, message = 'An error occurred') => {
    const error = new Error(message);
    error.status = code;
    throw error; 
};

// --- 404 HANDLER ---
app.use((req, res, next) => {
    const err = new Error(`The path "${req.originalUrl}" was not found.`);
    err.status = 404;
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ status: 404, message: err.message });
    }
    next(err); 
});

// --- GLOBAL ERROR HANDLER (The Final Catcher) ---
app.use((err, req, res, next) => {
    // Auto log the crash with full stack trace
    Logger.error(`[${err.status || 500}] ${req.method} ${req.url} - ${err.message}\nStack: ${err.stack}`);

    const statusCode = err.status || 500;

    if (process.env.APP_DEBUG === 'true') {
        return res.status(statusCode).send(`
            <div style="padding: 20px; font-family: sans-serif; line-height: 1.5;">
                <h1 style="color: #d9534f;">Kuppa Exception [${statusCode}]</h1>
                <p><strong>Message:</strong> ${err.message}</p>
                <pre style="background: #f8f9fa; padding: 15px; border: 1px solid #ddd; overflow-x: auto;">${err.stack}</pre>
            </div>
        `);
    }

    if (statusCode === 404) {
        return res.status(404).render('errors/404', { layout: false });
    }

    res.status(500).render('errors/500', { layout: false });
});

// Global ERROR Handler
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