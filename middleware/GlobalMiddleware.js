const { supabase } = require('../../core/config/Database');

/**
 * GlobalMiddleware - Ultra Optimized Performance
 * Mengambil data DB secara paralel dengan validasi token
 */
module.exports = async (req, res, next) => {
    const token = req.cookies.Kuppa_session;
    res.locals.user = null;
    res.locals.globalUser = null;

    if (!token) return next();

    try {
        // 1. Decode JWT tanpa network request untuk ambil ID (Super Cepat)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload.sub;

        // 2. Jalankan validasi token dan query DB secara PARALEL
        // Ini memotong waktu tunggu hingga 50%
        const [authRes, dbRes] = await Promise.all([
            supabase.auth.getUser(token),
            supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('id', userId)
                .single()
        ]);

        const { data: { user: authUser }, error: authError } = authRes;
        const { data: dbUser, error: dbError } = dbRes;

        if (!authError && authUser && dbUser) {
            // Background session sync (tidak perlu ditunggu/await jika ingin lebih cepat)
            supabase.auth.setSession({ access_token: token, refresh_token: token });

            // Logic avatar
            let avatarUrl = dbUser.avatar_url;
            if (avatarUrl && !avatarUrl.startsWith('http')) {
                avatarUrl = avatarUrl.startsWith('/uploads/') ? avatarUrl : `/uploads/${avatarUrl}`;
            }

            // Set data ke request dan view engine
            req.user = dbUser;
            req.authUser = authUser;
            
            res.locals.user = dbUser;
            res.locals.globalUser = { 
                name: dbUser.full_name || 'User', 
                email: dbUser.email,
                avatar: avatarUrl || '/assets/img/default-avatar.png'
            };
        } else {
            // Jika token bermasalah
            res.clearCookie('Kuppa_session');
        }
    } catch (err) {
        console.error('[Kuppa Middleware Error]:', err.message);
    }
    
    return next();
};