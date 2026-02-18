/**
 * kuppa Engine - Async Wrapper
 * Integrated with Axios (http), Dot Notation, Named Routes, and Smart API Error Handling
 */
const axios = require('axios');

const catchAsync = (fn) => {
    return (req, res, next) => {
        const process = {
            req,
            res,
            // --- Default HTTP Client ---
            http: axios, 
            
            // --- Request Data ---
            body: req.body,
            params: req.params,
            query: req.query,
            user: res.locals.user || null,
            
            // --- View Helper ---
            // Supports dot notation for View AND Layout (e.g., 'auth.login')
            render: (view, data = {}) => {
                const viewPath = view.replace(/\./g, '/');
                
                if (data.layout && typeof data.layout === 'string') {
                    data.layout = data.layout.replace(/\./g, '/');
                }
                
                return res.render(viewPath, data);
            },

            // --- API Helper ---
            // Standard JSON response for API controllers
            json: (data, code = 200) => {
                return res.status(code).json(data);
            },
            
            // --- Navigation Helper ---
            // Detects named routes or falls back to raw URL
            redirect: (target) => {
                const namedRoute = global.kuppaRoutes ? global.kuppaRoutes[target] : null;
                return res.redirect(namedRoute || target);
            },
            
            // Compatibility flag for kuppa controllers logic
            get error() { return true; }
        };

        // Wrap execution in a Promise to catch sync/async errors
        Promise.resolve(fn(process)).catch((err) => {
            // Smart Error Responder
            const isApiRequest = req.originalUrl.startsWith('/api') || req.xhr;

            if (isApiRequest) {
                return res.status(err.status || 500).json({
                    status: 'error',
                    message: err.message,
                    // Only show stack trace if APP_DEBUG is true in .env
                    stack: process.env.APP_DEBUG === 'true' ? err.stack : undefined
                });
            }

            // Fallback to Express default error handler (for Web/HBS)
            next(err);
        });
    };
};

module.exports = catchAsync;