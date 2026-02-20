const hbs = require('hbs');
const path = require('path');

/**
 * Kuppa Engine - Global Helpers
 * Location: core/app/Helper.js
 */

try {
    // Mencari di folder Helpers (Relative path dari core/app/Helper.js)
    require('./Helpers/Kuppa_dump'); 
} catch (e) {
    // Jika gagal, coba cari di folder yang sama (core/app/Kuppa_dump.js)
    try {
        require('./Kuppa_dump');
    } catch (err) {
        console.error('\x1b[31m[Kuppa Error]\x1b[0m: Kuppa_dump.js not found! Please check your file location.');
    }
}

const registerHelpers = () => {
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
        // 1. Ambil path dari global routes
        const routePath = global.kuppaRoutes ? global.kuppaRoutes[name] : null;
    
        // 2. TRIGGER ERROR: Jika route tidak ditemukan, jangan cuma kasih '#'
        if (!routePath) {
            const err = new Error(`Kuppa Error: Route name [${name}] is not defined in your web.js or api.js routes.`);
            err.status = 500;
            // Ini akan ditangkap oleh try-catch di Controller
            throw err; 
        }
    
        let url = routePath;
        const params = options.hash;
    
        // 3. Mapping parameter (misal :id -> 1)
        if (params && Object.keys(params).length > 0) {
            for (const [key, value] of Object.entries(params)) {
                const placeholder = `:${key}`;
                if (url.includes(placeholder)) {
                    url = url.replace(new RegExp(placeholder, 'g'), value);
                }
            }
        }
    
        // 4. TRIGGER ERROR: Jika masih ada parameter yang belum terisi (misal /user/:id tapi :id belum diisi)
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