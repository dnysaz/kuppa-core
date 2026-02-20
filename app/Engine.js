const path = require('path');

/**
 * Kuppa Engine - Optimized Response & Performance
 * Location: app/Engine.js
 * Author: Ketut Dana
 */
module.exports = (req, res, next) => {
    // High-resolution real time for precise benchmarking
    const start = global.process.hrtime();
    
    // Cache Static Locals once per request to avoid multiple process.env access
    const locals = res.locals;
    locals.supabaseActive = !!(global.process.env.SUPABASE_URL && global.process.env.SUPABASE_KEY);
    locals.useSupabase = global.process.env.USE_SUPABASE !== 'false';
    locals.appName = global.process.env.APP_NAME || 'kuppa.js';
    locals.appVersion = global.process.env.APP_VERSION || '0.5.0';

    const originalRender = res.render;

    res.render = function (view, options = {}, callback) {
        let viewPath = view;

        // 1. Path Correction Logic
        // Only process string paths that are not absolute (prevents breaking system paths)
        if (typeof view === 'string' && !path.isAbsolute(view)) {
            if (view.indexOf('.') !== -1) {
                viewPath = view.split('.').join('/');
            } else if (view === 'login') {
                viewPath = 'auth/login';
            } else if (view === 'register') {
                viewPath = 'auth/register';
            }
        }

        // 2. Internal Render Execution
        const performRender = (data, cb) => {
            // Layout path correction
            if (data.layout && typeof data.layout === 'string' && data.layout.indexOf('.') !== -1) {
                data.layout = data.layout.split('.').join('/');
            }

            // Calculate exact render time
            const diff = global.process.hrtime(start);
            data.renderTime = (diff[0] + diff[1] / 1e9).toFixed(3);

            return originalRender.call(res, viewPath, data, cb);
        };

        // 3. Fluent Interface (Chainable API)
        const chain = {
            with: (dataOrKey, value = null) => {
                const renderData = Object.assign({}, locals);
                if (typeof dataOrKey === 'object') {
                    Object.assign(renderData, dataOrKey);
                } else {
                    renderData[dataOrKey] = value;
                }
                return performRender(renderData, callback);
            }
        };

        // 4. Legacy/Standard Call Handling
        const hasOptions = options && Object.keys(options).length > 0;
        const isLegacy = hasOptions || typeof options === 'function' || typeof callback === 'function';

        if (isLegacy) {
            const renderData = Object.assign({}, locals);
            const finalCb = typeof options === 'function' ? options : callback;
            if (hasOptions && typeof options === 'object') {
                Object.assign(renderData, options);
            }
            return performRender(renderData, finalCb);
        }

        return chain;
    };

    next();
};