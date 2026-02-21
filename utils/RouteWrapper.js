/**
 * kuppa Engine - Route Wrapper
 * Optimized for Grouping, Chaining, and Precise Error Messaging.
 * Handles undefined controller methods gracefully without crashing the app.
 */
const catchAsync = require('./CatchAsync');

global.kuppaRoutes = global.kuppaRoutes || {};

const wrap = (router) => {
    const methods = ['get', 'post', 'put', 'delete', 'patch'];
    
    methods.forEach((method) => {
        const originalMethod = router[method].bind(router);
        
        router[method] = (path, ...callbacks) => {
            const wrappedCallbacks = callbacks.map((callback) => {
                // Check if the callback is undefined (common when a method is commented out)
                if (typeof callback === 'undefined') {
                    return catchAsync(async (process) => {
                        // Throw a professional error that will be caught by KuppaJs Debugger
                        const error = new Error(`The requested method for route [${path}] is undefined. Please check if the function exists and is exported in your Controller.`);
                        error.status = 501; // Not Implemented
                        throw error;
                    });
                }

                // If it's a valid function, wrap it with catchAsync for global error handling
                return typeof callback === 'function' ? catchAsync(callback) : callback;
            });

            // Register the route to Express/Router
            originalMethod(path, ...wrappedCallbacks);
            
            // Return object for .name() chaining
            return {
                name: (routeName) => {
                    global.kuppaRoutes[routeName] = path;
                    return router; 
                }
            };
        };
    });

    /**
     * Standardized Group Function
     * Supports: 
     * 1. route.group([mw], (route) => {})
     * 2. route.group({ prefix: '/v1', middleware: [] }, (route) => {})
     */
    router.group = function(attributes, callback) {
        const express = require('express');
        const groupRouter = wrap(express.Router({ mergeParams: true }));
        
        let middlewares = [];
        let prefix = '/';

        // Logic for handling different argument types
        if (Array.isArray(attributes)) {
            // Case: [middleware]
            middlewares = attributes;
        } else if (typeof attributes === 'object' && attributes !== null) {
            // Case: { prefix: '/v1', middleware: [] }
            prefix = attributes.prefix || '/';
            middlewares = attributes.middleware || [];
        }

        // Execute the callback to register inner routes
        callback(groupRouter);

        // Mount the group router to the parent
        if (middlewares.length > 0) {
            this.use(prefix, middlewares, groupRouter);
        } else {
            this.use(prefix, groupRouter);
        }

        return this;
    };

    return router;
};

module.exports = wrap;