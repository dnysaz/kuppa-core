const path = require('path');

/**
 * Kuppa Engine - High Performance Render Engine
 * Optimized by Ketut Dana - Strictly Minimalist
 * Update: Added Explicit Core View Support
 */

// 1. MEMOIZATION: Read env once on server boot, not every request
const BOOT_CONFIG = {
    supabaseActive: !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY),
    useSupabase: process.env.USE_SUPABASE !== 'false',
    appName: process.env.APP_NAME || 'kuppa.js',
    appVersion: process.env.APP_VERSION || '0.7.0'
};

module.exports = (req, res, next) => {
    // High-resolution start time
    const hrStart = process.hrtime();
    
    const originalRender = res.render;

    /**
     * Optimized Render Override
     */
    res.render = function (view, options = {}, callback) {
        // State management for fluent chain
        const state = {
            viewPath: view || '',
            isCore: false
        };

        // Helper for path resolution (dot to slash)
        const resolvePath = (v) => {
            if (typeof v !== 'string' || path.isAbsolute(v)) return v;
            
            let p = v.includes('.') ? v.replace(/\./g, '/') : v;
            if (p === 'login' || p === 'register') p = `auth/${p}`;
            return p;
        };

        // Initial path resolution
        state.viewPath = resolvePath(view);

        /**
         * Core Render Processor
         */
        const performRender = (data, cb) => {
            // Layout path fix
            if (data && data.layout && typeof data.layout === 'string' && data.layout.includes('.')) {
                data.layout = data.layout.replace(/\./g, '/');
            }

            // Precise Benchmarking
            const hrDiff = process.hrtime(hrStart);
            data.renderTime = (hrDiff[0] + hrDiff[1] / 1e9).toFixed(3);

            // 3. EFFICIENT MERGE: Using spread operator
            const finalData = { ...BOOT_CONFIG, ...res.locals, ...data };

            // Determine final path based on core flag
            let finalPath = state.viewPath;
            if (state.isCore && typeof finalPath === 'string' && !path.isAbsolute(finalPath)) {
                finalPath = `../core/views/${finalPath}`;
            }

            return originalRender.call(res, finalPath, finalData, cb);
        };

        // 4. MODERN FLUENT API: Supporting .core() and .with()
        const chain = {
            // Force lookup into core/views folder
            core: function(coreView = null) {
                state.isCore = true;
                if (coreView) state.viewPath = resolvePath(coreView);
                return this;
            },

            with: function(dataOrKey, value = null) {
                const payload = (typeof dataOrKey === 'object') 
                    ? dataOrKey 
                    : { [dataOrKey]: value };
                return performRender(payload, callback);
            }
        };

        // 5. COMPACT LEGACY SUPPORT
        const hasOptions = options && typeof options === 'object' && Object.keys(options).length > 0;
        if (hasOptions || typeof options === 'function' || typeof callback === 'function') {
            const finalCb = typeof options === 'function' ? options : callback;
            return performRender(hasOptions ? options : {}, finalCb);
        }

        return chain;
    };

    next();
};