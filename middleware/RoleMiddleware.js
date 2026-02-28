const Profile       = appFile('Models.Profile');
const { supabase }  = coreFile('config.Database');

module.exports = (roles = []) => {
    return async (req, res, next) => {
        try {
            // 1. Ambil email dari session
            let userEmail = req.session.user_email;

            // 2. BACKUP: Jika session kosong (kasus Google Login), ambil dari Token
            if (!userEmail) {
                const token = req.cookies.Kuppa_session;
                if (token) {
                    const { data: { user }, error } = await supabase.auth.getUser(token);
                    if (user) {
                        userEmail = user.email;
                        req.session.user_email = userEmail;
                    }
                }
            }

            if (!userEmail) {
                res.flash('error', 'Please login first.');
                return res.redirect('/login');
            }

            // 3. Cek Role di DB
            const userProfile = await Profile.findByEmail(userEmail);
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!userProfile || !allowedRoles.includes(userProfile.role)) {
                res.flash('error', 'Unauthorized access.');
                return res.redirect('/dashboard');
            }

            res.locals.userRole = userProfile.role;
            next();
        } catch (error) {
            res.redirect('/dashboard');
        }
    };
};