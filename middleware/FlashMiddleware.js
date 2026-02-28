/**
 * FlashMiddleware - Kuppa Framework
 * Optimized by Ketut Dana - Persistence Guaranteed & Anti-Crash
 */
module.exports = (req, res, next) => {
    // 1. Ambil data dari session dengan pengaman
    const flashError = req.session ? req.session.flash_error : null;
    const flashSuccess = req.session ? req.session.flash_success : null;
    const oldInput = req.session ? (req.session.old_input || {}) : {};

    // 2. Kirim ke locals agar bisa dibaca HBS
    res.locals.flash_error = flashError;
    res.locals.flash_success = flashSuccess;
    res.locals.old = oldInput;

    /**
     * 3. LOGIKA PEMBERSIHAN AMAN
     * Hanya hapus jika session ada dan method adalah GET
     */
    if (req.method === 'GET' && req.session) {
        delete req.session.flash_error;
        delete req.session.flash_success;
        delete req.session.old_input;
    }

    /**
     * 4. Smart Redirect Override
     * Added check: Only call save() if session exists
     */
    const nativeRedirect = res.redirect.bind(res);
    res.redirect = function(url) {
        // Ensure destination is a string and handle 'back'
        let destination = url === 'back' ? (req.get('Referer') || '/') : url;

        if (req.session) {
            // Save session before redirect for persistence
            return req.session.save(() => {
                return nativeRedirect(destination);
            });
        }

        return nativeRedirect(destination);
    };

    /**
     * 5. Fluent API Helpers
     * Updated to support Route Names and safe fallback
     */
    res.flash = (type, message) => {
        if (req.session) {
            if (type === 'error') req.session.flash_error = message;
            if (type === 'success') req.session.flash_success = message;
        }

        return {
            /**
             * Redirect using route name
             * Usage: .toRoute('blog.show', { slug: 'my-post' })
             */
            toRoute: (routeName, params = {}) => {
                let destination = routeName;

                try {
                    // Check for global route helper (Kuppa Standard)
                    if (typeof global.route === 'function') {
                        destination = global.route(routeName, params);
                    } 
                    // Check for request-bound helper
                    else if (typeof req.routeToUrl === 'function') {
                        destination = req.routeToUrl(routeName, params);
                    }
                } catch (e) {
                    console.error(`Kuppa Router Error: Failed to resolve [${routeName}]`);
                }

                /**
                 * SAFETY CHECK: 
                 * If destination doesn't start with '/' and contains dots, 
                 * it's likely a failed route name resolution.
                 */
                if (!destination.startsWith('/') && routeName.includes('.')) {
                    console.warn(`[Kuppa] Warning: Route name "${routeName}" not found. Ensure it is registered.`);
                }

                return res.redirect(destination);
            },
            back: () => res.redirect('back'),
            withInput: (input) => {
                res.withInput(input);
                // Return this same object to allow further chaining
                return res.flash(type, message); 
            }
        };
    };

    /**
     * Helper to store old input into session
     */
    res.withInput = (input) => {
        if (!input || !req.session) return res;
        const secureInput = { ...input };
        const sensitive = ['password', 'confirmPassword', 'newPassword'];
        sensitive.forEach(field => delete secureInput[field]);
        req.session.old_input = secureInput;
        return res;
    };

    next();
};