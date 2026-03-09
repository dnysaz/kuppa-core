const { supabase }   = coreFile('Config.Database');
const Profile        = appFile('Models.Profile'); 


module.exports = (roles = []) => {
    return async (req, res, next) => {
        try {
            const validRoutes = Object.values(global.kuppaRoutes || {});
            const isRegistered = validRoutes.includes(req.path);
            
            if (!isRegistered) return next();

            let userEmail = req.session.user_email;
            if (!userEmail) {
                const token = req.cookies.Kuppa_session;
                if (token) {
                    const { data: { user } } = await supabase.auth.getUser(token);
                    if (user) userEmail = user.email;
                }
            }

            if (!userEmail) {
                res.flash('error', 'Please login first.');
                return res.redirect('/login');
            }

            const userProfile = await Profile.findByEmail(userEmail);
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!userProfile || !allowedRoles.includes(userProfile.role)) {
                res.flash('error', 'Unauthorized access.');
                return res.redirect('/dashboard');
            }

            res.locals.userRole = userProfile.role;
            next();
        } catch (error) {
            console.error('[RoleMiddleware Error]:', error);
            next(error); 
        }
    };
};