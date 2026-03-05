const { supabase } = coreFile('config.Database');
const BaseApi      = coreFile('controller.BaseApiController');

const ApiAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // --- PINTU KELUAR 1: JIKA TIDAK ADA TOKEN ---
        // Alih-alih return error, kita next() saja.
        // Jika rute tidak ada, Express akan lanjut ke 404 Handler secara otomatis.
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];

        if (!supabase) {
            console.error('[Kuppa Error] Supabase instance is undefined');
            throw new Error('Database config not loaded');
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        // --- PINTU KELUAR 2: TOKEN ADA TAPI SALAH ---
        // Di sini kita boleh return error karena user sudah mencoba autentikasi
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