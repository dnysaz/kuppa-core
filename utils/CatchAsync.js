/**
 * kuppa Engine - Async Wrapper
 * Integrated with Axios (http), Dot Notation, Named Routes, and Smart API Error Handling
 * Optimized by Ketut Dana
 */
const axios = require('axios');

const catchAsync = (fn) => {
    return (req, res, next) => {
        // Build the "process" object used in Controllers
        const process = {
            req,
            res,
            next, // FIX: Menambahkan fungsi next ke dalam objek agar process.next(err) tidak error
            
            // --- Default HTTP Client ---
            http: axios, 
            
            // --- Request Data ---
            body: req.body,
            params: req.params,
            query: req.query,
            user: res.locals.user || req.user || null,
            
            // --- View Helper ---
            render: (view, data = {}) => {
                const viewPath = view.replace(/\./g, '/');
                if (data.layout && typeof data.layout === 'string') {
                    data.layout = data.layout.replace(/\./g, '/');
                }
                return res.render(viewPath, data);
            },

            // --- API Helper ---
            json: (data, code = 200) => {
                return res.status(code).json(data);
            },
            
            // --- Navigation Helper ---
            redirect: (target) => {
                const namedRoute = global.kuppaRoutes ? global.kuppaRoutes[target] : null;
                return res.redirect(namedRoute || target);
            },
            
            // Compatibility flag
            get error() { return true; }
        };

        // Execution logic
        Promise.resolve(fn(process)).catch((err) => {
            // Handle KUPPA_DUMP immediately before checking API/Web
            if (err.message === 'KUPPA_DUMP') {
                return next(err);
            }

            const isApiRequest = req.originalUrl.startsWith('/api') || req.xhr;

            if (isApiRequest) {
                const statusCode = err.status || 500;
                return res.status(statusCode).json({
                    status: 'error',
                    message: err.message,
                    stack: global.process.env.APP_DEBUG === 'true' ? err.stack : undefined
                });
            }

            // Standard error propagation to ExceptionHandler
            next(err);
        });
    };
};

module.exports = catchAsync;