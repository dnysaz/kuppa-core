/**
 * fxd4 Engine - Route Wrapper
 * Optimized for Grouping & Chaining
 */
const catchAsync = require('./CatchAsync');

global.fxd4Routes = global.fxd4Routes || {};

const wrap = (router) => {
    const methods = ['get', 'post', 'put', 'delete', 'patch'];
    
    methods.forEach((method) => {
        const originalMethod = router[method].bind(router);
        
        router[method] = (path, ...callbacks) => {
            const wrappedCallbacks = callbacks.map((callback) => {
                return typeof callback === 'function' ? catchAsync(callback) : callback;
            });

            // Register to Express
            originalMethod(path, ...wrappedCallbacks);
            
            // Return object for .name() chaining
            return {
                name: (routeName) => {
                    global.fxd4Routes[routeName] = path;
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