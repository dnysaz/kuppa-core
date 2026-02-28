/**
 * kuppa Engine - Route Wrapper
 * Optimized for Grouping, Chaining, and Precise Error Messaging.
 * Update: Full Automatic Async Error Handling for Controllers.
 */
const catchAsync = require('./CatchAsync');

global.kuppaRoutes = global.kuppaRoutes || {};
const controllerInstances = new Map();

const wrap = (router) => {
    const methods = ['get', 'post', 'put', 'delete', 'patch'];
    
    methods.forEach((method) => {
        const originalMethod = router[method].bind(router);
        
        router[method] = (path, ...callbacks) => {
            const wrappedCallbacks = callbacks.map((callback) => {
                
                // 1. Handle Array Syntax: [HomeController, 'index']
                if (Array.isArray(callback) && callback.length === 2) {
                    const [ControllerClass, methodName] = callback;

                    return catchAsync(async (process) => {
                        // Check if ControllerClass is valid
                        if (!ControllerClass) {
                            throw new Error(`Controller for route [${path}] is undefined. Check your require or config.`);
                        }

                        let instance = controllerInstances.get(ControllerClass);
                        
                        // Singleton instantiation for instance methods
                        if (!instance) {
                            if (typeof ControllerClass === 'function' && ControllerClass.prototype) {
                                instance = new ControllerClass();
                                controllerInstances.set(ControllerClass, instance);
                            } else {
                                // Fallback for static objects/exports
                                instance = ControllerClass;
                            }
                        }

                        // Check if method exists on instance
                        if (typeof instance[methodName] !== 'function') {
                            const error = new Error(`Method [${methodName}] not found in [${ControllerClass.name || 'Controller'}].`);
                            error.status = 501;
                            throw error;
                        }

                        // Execute and let catchAsync handle any internal errors
                        return await instance[methodName](process);
                    });
                }

                // 2. Handle Undefined Callbacks (Commonly caused by removing 'static' without using array syntax)
                if (typeof callback === 'undefined' || callback === null) {
                    return catchAsync(async (process) => {
                        const error = new Error(`Route [${path}] callback is undefined. If you removed 'static', use array syntax [Controller, 'method'].`);
                        error.status = 501;
                        throw error;
                    });
                }

                // 3. Handle Regular Functions (Middleware or Anonymous Controllers)
                // We wrap them with catchAsync to ensure global error catching
                return typeof callback === 'function' ? catchAsync(callback) : callback;
            });

            // Apply the wrapped callbacks to the original Express method
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
     */
    router.group = function(attributes, callback) {
        const express = require('express');
        const groupRouter = wrap(express.Router({ mergeParams: true }));
        let middlewares = [];
        let prefix = '/';

        if (Array.isArray(attributes)) {
            middlewares = attributes;
        } else if (typeof attributes === 'object' && attributes !== null) {
            prefix = attributes.prefix || '/';
            middlewares = attributes.middleware || [];
        }

        callback(groupRouter);

        if (middlewares.length > 0) {
            this.use(prefix, middlewares, groupRouter);
        } else {
            this.use(prefix, groupRouter);
        }

        return this;
    };

    return router;
};

/**
 * Global Route Resolver
 * Converts 'blog.show' + {slug: 'test'} into '/blog/show/test'
 */
global.route = (name, params = {}) => {
    let path = global.kuppaRoutes[name];

    if (!path) {
        return name; 
    }

    Object.keys(params).forEach(key => {
        path = path.replace(`:${key}`, params[key]);
    });

    return path;
};

module.exports = wrap;