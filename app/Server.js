const path = require('path');
const rootDir = path.join(__dirname, '../../');

// 1. LOAD DOTENV FIRST
require('dotenv').config({ path: path.join(rootDir, '.env') });

const express = require('express');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const { registerHelpers } = require('./Helper');
const GlobalMiddleware = require('../../app/Middleware/GlobalMiddleware');

const app = express();

/**
 * kuppa Engine - Server Core
 * Optimized by Ketut Dana
 */

// --- INITIALIZE HELPERS ---
registerHelpers();

// --- LIVERELOAD SETUP ---
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
hbs.registerPartials(path.join(rootDir, 'views/partials'));
hbs.registerPartials(path.join(rootDir, 'views/components')); 

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(rootDir, 'public')));

if (process.env.APP_DEBUG !== 'true') {
    app.enable('view cache');
}

/**
 * GLOBAL ENGINE MIDDLEWARE (Performance & State)
 */
app.use((req, res, next) => {
    const start = process.hrtime();
    
    // Inject Basic Global Variables
    res.locals.supabaseActive = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
    res.locals.useSupabase = process.env.USE_SUPABASE !== 'false';
    res.locals.appName = process.env.APP_NAME || 'kuppa.js';
    res.locals.appVersion = process.env.APP_VERSION || '0.5.0';

    // Performance Profiler Helper
    const originalRender = res.render;
    res.render = function (view, options, callback) {
        const diff = process.hrtime(start);
        res.locals.renderTime = (diff[0] + diff[1] / 1e9).toFixed(3);
        originalRender.call(this, view, options, callback);
    };
    next();
});

/**
 * APP GLOBAL MIDDLEWARE
 * Logic for Database and User Auth Synchronization
 */
app.use(GlobalMiddleware);

// --- ROUTES SEPARATION ---
// Opinionated: Keep API and Web routes separate
app.use('/api', require(path.join(rootDir, 'routes/api'))); // API Endpoints
app.use('/', require(path.join(rootDir, 'routes/web')));    // Web Interface

// --- 404 CATCHER ---
app.use((req, res, next) => {
    const err = new Error(`The path "${req.originalUrl}" was not found.`);
    err.status = 404;
    
    // Smart 404: If request starts with /api, send JSON. Otherwise, render 404 page.
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
            status: 404,
            message: err.message
        });
    }
    
    next(err); 
});

// --- ERROR HANDLING ---
app.use(require('../middleware/ExceptionHandler')); 

/**
 * SERVER STARTING
 */
const startServer = () => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Kuppa.JS running at http://localhost:${PORT}`);
        console.log(`Hello Kuppa!`);
        console.log(`The Minimalist Javascript Supabase Framework`);

    });
};

module.exports = { app, startServer };