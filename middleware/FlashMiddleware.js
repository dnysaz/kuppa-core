/**
 * FlashMiddleware - Kuppa Framework
 * Optimized by Ketut Dana - Laravel-like Flash & Smart Redirect
 */
module.exports = (req, res, next) => {
    // 1. Map session data to locals for HBS access
    res.locals.flash_error = req.session.flash_error;
    res.locals.flash_success = req.session.flash_success;
    res.locals.old = req.session.old_input;

    // 2. Clear session data (Flash logic)
    delete req.session.flash_error;
    delete req.session.flash_success;
    delete req.session.old_input;

    /**
     * 3. Smart Redirect Override
     * Intercepts 'back' keyword to use Referer header
     */
    const nativeRedirect = res.redirect;
    res.redirect = function(url) {
        if (url === 'back') {
            const destination = req.get('Referer') || req.get('Referrer') || '/';
            return nativeRedirect.call(this, destination);
        }
        return nativeRedirect.call(this, url);
    };

    /**
     * 4. Fluent API Helpers
     */
    res.flash = (type, message) => {
        if (type === 'error') req.session.flash_error = message;
        if (type === 'success') req.session.flash_success = message;
    };

    res.withInput = (input) => {
        // Filter out sensitive data if necessary before storing
        const secureInput = { ...input };
        if (secureInput.password) delete secureInput.password;
        if (secureInput.confirmPassword) delete secureInput.confirmPassword;
        
        req.session.old_input = secureInput;
    };

    next();
};