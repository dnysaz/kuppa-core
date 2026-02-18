/**
 * DatabaseFeatureMiddleware - fxd4 Core Engine
 * Optimized for High-Performance & Error Catching
 */
module.exports = (req, res, next) => {
    const useSupabase = process.env.USE_SUPABASE === 'true';
    const hasCredentials = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;

    // Jika fitur diaktifkan tapi kredensial kosong, atau fitur dimatikan
    if (!useSupabase || !hasCredentials) {
        const error = new Error('Database Configuration Needed');
        error.status = 403;
        
        /**
         * Menggunakan format yang konsisten dengan ExceptionHandler.
         * Kita berikan pesan yang jelas kenapa akses ditolak.
         */
        error.statusText = !useSupabase 
            ? 'Supabase feature is currently disabled.' 
            : 'Supabase credentials (URL/KEY) are missing in .env.';

        return next(error);
    }

    next();
};