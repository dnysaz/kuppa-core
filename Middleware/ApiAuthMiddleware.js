const { supabase } = coreFile('Config.Database');
const BaseApi      = coreFile('Controller.BaseApiController');

const ApiAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];

        if (!supabase) {
            console.error('[Kuppa Error] Supabase instance is undefined');
            throw new Error('Database config not loaded');
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);


        if (error || !user) {
            return BaseApi.unauthorized(res, 'Invalid or expired token.');
        }

        req.user = user; 
        next();
    } catch (err) {
        console.error('[Kuppa API Auth Error]', err); 
        return BaseApi.error(res, 'Internal Server Error: ' + err.message, 500);
    }
};

module.exports = ApiAuthMiddleware;