'use strict'

const path = require('path');
const hbs = require('hbs');

/**
 * Kuppa Engine - Global Helpers
 * Location: core/app/Helper.js
 * Standardized by Ketut Dana
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
    // Ensure coreFile is available in your global scope or context
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

    // --- 2. DATA MANIPULATION & LOGIC ---
    hbs.registerHelper('slice', function (str, start, end) {
        return (str && typeof str === 'string') ? str.slice(start, end) : '';
    });

    hbs.registerHelper('eq', function (a, b) {
        return a === b;
    });

    hbs.registerHelper('gt', function (a, b) {
        return a > b;
    });

    hbs.registerHelper('lt', function (a, b) {
        return a < b;
    });

    hbs.registerHelper('add', function (a, b) {
        return Number(a) + Number(b);
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

    // --- 4. AUTH & ROLES ---
    hbs.registerHelper('role', function (requiredRole, options) {
        const currentUserRole = options.data.root.userRole;

        if (currentUserRole === requiredRole) {
            return options.fn(this);
        }
        return options.inverse(this);
    });

    // --- 5. KUPPA ULTIMATE PAGINATION ---
    /**
     * Clean & Automated Navigation for Ketut Dana
     * Usage: {{{ paginate blogs }}}
     */
    hbs.registerHelper('paginate', function (collection) {
        if (!collection || !collection.meta || collection.meta.lastPage <= 1) {
            return '';
        }

        const { currentPage, lastPage } = collection.meta;
        
        // Previous Button logic
        const prevDisabled = currentPage <= 1;
        const prevUrl = `?page=${currentPage - 1}`;
        const prevLink = prevDisabled 
            ? `<span class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-300 cursor-not-allowed">&larr; Previous</span>`
            : `<a href="${prevUrl}" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">&larr; Previous</a>`;

        // Next Button logic
        const nextDisabled = currentPage >= lastPage;
        const nextUrl = `?page=${currentPage + 1}`;
        const nextLink = nextDisabled
            ? `<span class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-300 cursor-not-allowed">Next &rarr;</span>`
            : `<a href="${nextUrl}" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Next &rarr;</a>`;

        const html = `
        <nav class="mt-12 flex justify-center items-center gap-4">
            ${prevLink}
            <span class="text-sm text-gray-500">
                Page <strong>${currentPage}</strong> of <strong>${lastPage}</strong>
            </span>
            ${nextLink}
        </nav>`;

        return new hbs.SafeString(html);
    });
};

module.exports = { registerHelpers };