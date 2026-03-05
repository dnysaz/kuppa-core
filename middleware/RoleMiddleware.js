module.exports = (roles = []) => {
    return async (req, res, next) => {
        try {
            // 1. CEK APAKAH RUTE VALID
            const validRoutes = Object.values(global.kuppaRoutes || {});
            const isRegistered = validRoutes.includes(req.path);
            
            // JIKA RUTE TIDAK ADA, JANGAN PROSES ROLE, BIARKAN NEXT() AGAR JADI 404
            if (!isRegistered) return next();

            // 2. Ambil user (Logika lama kamu)
            let userEmail = req.session.user_email;
            if (!userEmail) {
                const token = req.cookies.Kuppa_session;
                if (token) {
                    const { data: { user } } = await supabase.auth.getUser(token);
                    if (user) userEmail = user.email;
                }
            }

            // Jika belum login, redirect ke login
            if (!userEmail) {
                res.flash('error', 'Please login first.');
                return res.redirect('/login');
            }

            // 3. Cek Role
            const userProfile = await Profile.findByEmail(userEmail);
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!userProfile || !allowedRoles.includes(userProfile.role)) {
                res.flash('error', 'Unauthorized access.');
                return res.redirect('/dashboard');
            }

            res.locals.userRole = userProfile.role;
            next();
        } catch (error) {
            // JANGAN REDIRECT KE DASHBOARD SAAT ERROR, BIARKAN 404/500 HANDLER
            // Kita log saja errornya
            console.error('[RoleMiddleware Error]:', error);
            next(error); 
        }
    };
};