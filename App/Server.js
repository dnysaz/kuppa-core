/**
 * Kuppa Engine - Server Core
 * Optimized by Ketut Dana - High Performance Version
 * Standardized for The minimalist javascript supabase framework
 */

const path = require('path');
const fs   = require('fs');

const autoloadPath = path.join(process.cwd(), 'Core', 'Autoload.js');

if (fs.existsSync(autoloadPath)) {
    require(autoloadPath);
} else {
    throw new Error(`Critical Error: Autoload.js not found at ${autoloadPath}`);
}

const rootDir = path.resolve(__dirname, '../../');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}


// 2. CORE MODULES
const express      = require('express');
const hbs          = require('hbs');
const cookieParser = require('cookie-parser');
const os           = require('os');
const net          = require('net');
const compression  = require('compression');
const session      = require('express-session');

// 3. INTERNAL ENGINE HELPERS
const { registerHelpers }       = coreFile('App.Helper');
const Engine                    = coreFile('App.Engine');
const FlashMiddleware           = coreFile('Middleware.FlashMiddleware');
const GlobalMiddleware          = coreFile('Middleware.GlobalMiddleware');
const Logger                    = coreFile('Utils.Logger');
const LogMiddleware             = coreFile('Middleware.LogMiddleware');
const ExceptionHandler          = coreFile('Middleware.ExceptionHandler');
const DatabaseFeatureMiddleware = coreFile('Middleware.DatabaseFeatureMiddleware');


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
app.use(express.static(path.join(rootDir, 'Public'), { maxAge: '1d' }));

// --- INITIALIZE VIEW HELPERS ---
registerHelpers();

// --- LIVERELOAD SETUP (Development Only) ---
if (process.env.APP_DEBUG === 'true') {
    const livereload        = require("livereload");
    const connectLiveReload = require("connect-livereload");
    const liveReloadServer  = livereload.createServer();
    liveReloadServer.watch(path.join(rootDir, 'Views'));
    liveReloadServer.watch(path.join(rootDir, 'Public'));
    app.use(connectLiveReload());
    liveReloadServer.server.once("connection", () => {
        setTimeout(() => liveReloadServer.refresh("/"), 100);
    });
}

// --- VIEW ENGINE CONFIGURATION ---
app.set('view engine', 'hbs');
app.set('views', [
    path.join(rootDir, 'Views'),
    path.join(rootDir, 'Core/Views')
]);
app.set('view options', { layout: 'Layouts/app' });

if (process.env.APP_DEBUG !== 'true') app.enable('view cache');

hbs.registerPartials(path.join(rootDir, 'Views/Partials'));
hbs.registerPartials(path.join(rootDir, 'Views/Components')); 

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
            return res.render('Mode/maintenance', {
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


app.use(DatabaseFeatureMiddleware)

// --- ROUTE REGISTRATION ---

// 1. API - Dipasang secara eksklusif di /api
app.use('/api', require(path.join(rootDir, 'Routes/Api')));

// 2. WEB - Dibuat router khusus, dan DIPAKSA untuk tidak menangani /api
const webRouter = express.Router();

// Middleware Web (Hanya untuk Web)
webRouter.use(Engine);
webRouter.use(FlashMiddleware);
webRouter.use(GlobalMiddleware);
webRouter.use(LogMiddleware);

// Rute Web
webRouter.use('/', require(path.join(rootDir, 'Routes/Web')));

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
    Logger.error(`[${err.status || 500}] ${req.method} ${req.url} - ${err.message}`);
    return ExceptionHandler(err, req, res, next);
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