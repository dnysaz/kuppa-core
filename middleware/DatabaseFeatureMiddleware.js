/**
 * DatabaseFeatureMiddleware - Kuppa Core Engine
 */
module.exports = (req, res, next) => {
    const useSupabase = process.env.USE_SUPABASE === 'true';
    const hasCredentials = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;

    // Cek apakah database benar-benar aktif dan siap
    if (!useSupabase || !hasCredentials) {
        
        // Simpan status untuk UI (opsional)
        res.locals.dbStatus = {
            isDisabled: true,
            message: !useSupabase 
                ? 'Database feature is disabled.' 
                : 'Database credentials missing.'
        };

        /**
         * LOGIKA BLOKIR:
         * Jika user mencoba akses selain halaman Home ('/'), 
         * kita lempar ke halaman error atau redirect ke Home.
         */
        if (req.path !== '/') {
            // Opsi 1: Redirect ke home dengan pesan error
            // return res.redirect('/?error=db_required');

            // Opsi 2: Kirim error 403 agar ditangkap Debugger KuppaJs
            const error = new Error('Database Connection Required');
            error.status = 403;
            error.statusText = 'Halaman ini membutuhkan koneksi Supabase yang aktif.';
            return next(error); 
        }
    }

    next();
};