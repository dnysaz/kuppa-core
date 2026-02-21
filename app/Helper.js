const hbs = require('hbs');
const path = require('path');

/**
 * Kuppa Engine - Global Helpers
 * Location: core/app/Helper.js
 */

// Load Kuppa Dump Utility
try {
    require('./Helpers/Kuppa_dump'); 
} catch (e) {
    try {
        require('./Kuppa_dump');
    } catch (err) {
        console.error('\x1b[31m[Kuppa Error]\x1b[0m: Kuppa_dump.js not found!');
    }
}

const registerHelpers = () => {

    // --- 0. KUPPA INTERNAL HELPERS ---
    // Registered from FlashHelper.js
    coreFile('utils.FlashHelper').register();

    // --- 1. LAYOUT SECTIONS ---
    hbs.registerHelper('set', function (name, value) {
        if (!this._sections) this._sections = {};
        this._sections[name] = value;
        return null;
    });

    hbs.registerHelper('get', function (name, options) {
        const sections = this._sections || {};
        return sections[name] || (options.hash ? options.hash.default : '');
    });

    // --- 2. DATA MANIPULATION ---
    hbs.registerHelper('slice', function (str, start, end) {
        return (str && typeof str === 'string') ? str.slice(start, end) : '';
    });

    hbs.registerHelper('eq', function (a, b) {
        return a === b;
    });

    hbs.registerHelper('json', function (context) {
        return JSON.stringify(context, null, 4);
    });

    // --- 3. URL & ASSETS ---
    hbs.registerHelper('asset', function (path) {
        return `/assets/${path}`;
    });

    hbs.registerHelper('route', function (name, options) {
        const routePath = global.kuppaRoutes ? global.kuppaRoutes[name] : null;
    
        if (!routePath) {
            const err = new Error(`Kuppa Error: Route name [${name}] is not defined.`);
            err.status = 500;
            throw err; 
        }
    
        let url = routePath;
        const params = options.hash;
    
        if (params && Object.keys(params).length > 0) {
            for (const [key, value] of Object.entries(params)) {
                const placeholder = `:${key}`;
                if (url.includes(placeholder)) {
                    url = url.replace(new RegExp(placeholder, 'g'), value);
                }
            }
        }
    
        if (url.includes(':')) {
            const missingParam = url.split(':').pop().split('/')[0];
            const err = new Error(`Kuppa Error: Missing parameter [${missingParam}] for route [${name}]`);
            err.status = 500;
            throw err;
        }
    
        return url;
    });
};

module.exports = { registerHelpers };