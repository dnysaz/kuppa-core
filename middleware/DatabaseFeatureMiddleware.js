/**
 * DatabaseFeatureMiddleware - Kuppa Core Engine
 * Optimized for High-Performance & Seamless User Experience
 */
module.exports = (req, res, next) => {
    const useSupabase = process.env.USE_SUPABASE === 'true';
    const hasCredentials = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;

    // Jika kredensial kosong atau fitur dimatikan
    if (!useSupabase || !hasCredentials) {
        /**
         * Jangan di-next(error) agar tidak crash.
         * Kita simpan statusnya ke res.locals agar bisa dibaca di file .hbs
         */
        res.locals.dbStatus = {
            isDisabled: true,
            message: !useSupabase 
                ? 'Supabase feature is currently disabled.' 
                : 'Supabase credentials (URL/KEY) are missing in .env.'
        };

        // Tetap lanjut ke proses berikutnya (Controller)
        return next();
    }

    next();
};