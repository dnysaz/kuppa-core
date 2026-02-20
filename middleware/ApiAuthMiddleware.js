const { supabase } = require('../../core/config/Database');
const BaseApi = require('../../core/api/BaseApiController');

/**
 * ApiAuthMiddleware - Kuppa Framework
 * Protects API routes using Supabase JWT / Bearer Token
 */
const ApiAuthMiddleware = async (process, next) => {
    try {
        const authHeader = process.req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return BaseApi.unauthorized(process.res, 'Missing or invalid token format. Use Bearer token.');
        }

        const token = authHeader.split(' ')[1];

        // Verify token with Supabase Auth
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return BaseApi.unauthorized(process.res, 'Invalid or expired token.');
        }

        // Inject user data into the process object for the controller
        process.user = user;
        
        // Go to next middleware/controller
        next();
    } catch (err) {
        console.error('[Kuppa API Auth Error]', err.message);
        return BaseApi.error(process.res, 'Internal Server Error during Authentication', 500);
    }
};

module.exports = ApiAuthMiddleware;