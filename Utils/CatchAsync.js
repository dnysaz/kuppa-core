/**
 * Kuppa Engine - Async Wrapper
 */
const axios = require('axios');

const catchAsync = (fn) => {
    return (req, res, next) => {
        
        if (fn.length === 3) {
            return Promise.resolve(fn(req, res, next)).catch(next);
        }

        const process = {
            req, res, next, 
            http: axios, 
            body: req.body,
            params: req.params,
            query: req.query,
            user: res.locals.user || req.user || null,
            
            // View Helper
            view: (viewPath, data = {}) => ({
                with: (additionalData) => {
                    const formattedPath = viewPath.replace(/\./g, '/');
                    const finalData = { ...data, ...additionalData };
                    if (finalData.layout && typeof finalData.layout === 'string') {
                        finalData.layout = finalData.layout.replace(/\./g, '/');
                    }
                    return res.render(formattedPath, finalData);
                }
            }),
            
            // Legacy Render
            render: (view, data = {}) => {
                const viewPath = view.replace(/\./g, '/');
                return res.render(viewPath, data);
            },
            
            // API Helper
            json: (data, code = 200) => res.status(code).json(data),
            
            // Navigation Helper
            redirect: (target) => {
                const namedRoute = global.kuppaRoutes ? global.kuppaRoutes[target] : null;
                return res.redirect(namedRoute || target);
            }
        };

        // Execution logic untuk Controller
        Promise.resolve(fn(process)).catch((err) => {
            // Handle KUPPA_DUMP (hanya untuk debugging)
            if (err.message === 'KUPPA_DUMP') return next(err);

            const isApiRequest = req.originalUrl.startsWith('/api') || req.xhr;
            const statusCode = err.status || 500;

            if (isApiRequest) {
                return res.status(statusCode).json({
                    status: 'error',
                    message: err.message,
                    stack: global.process.env.APP_DEBUG === 'true' ? err.stack : undefined
                });
            }
            next(err);
        });
    };
};

module.exports = catchAsync;