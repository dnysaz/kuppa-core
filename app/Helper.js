const hbs = require('hbs');
require('./Helpers/Kuppa_dump');

/**
 * kuppa Engine - Global Helpers
 * Optimized by Ketut Dana
 */

const registerHelpers = () => {
    // Section Setter
    hbs.registerHelper('set', function (name, value) {
        if (!this._sections) this._sections = {};
        this._sections[name] = value;
        return null;
    });

    // Section Getter
    hbs.registerHelper('get', function (name, options) {
        return this._sections ? this._sections[name] : options.hash.default;
    });

    // String Slicer
    hbs.registerHelper('slice', function (str, start, end) {
        return (str && typeof str === 'string') ? str.slice(start, end) : '';
    });

    hbs.registerHelper('eq', function (a, b) {
        return a === b;
    });

    // Named Route Resolver
    hbs.registerHelper('route', function (name, options) {
        const routePath = global.kuppaRoutes ? global.kuppaRoutes[name] : null;
        if (!routePath) return '#';

        let url = routePath;
        const params = options.hash;

        if (params && Object.keys(params).length > 0) {
            Object.keys(params).forEach(key => {
                url = url.replace(`:${key}`, params[key]);
            });
        }

        return url;
    });
};

module.exports = { registerHelpers };