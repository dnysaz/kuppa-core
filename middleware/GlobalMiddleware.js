const { supabase } = require('../../core/config/Database');

// Native Memory Storage (Zero Dependency)
if (!global.kuppaMemory) {
    global.kuppaMemory = new Map();
}

/**
 * GlobalMiddleware - Optimized for High RPS & Instant Invalidation
 * No Node-Cache needed, using Native Map.
 */
module.exports = async (req, res, next) => {
    const token = req.cookies.Kuppa_session;
    const urlPath = req.path;

    // 1. Reset Locals
    res.locals.currentRoute = urlPath === '/' ? 'home' : urlPath.split('/')[1];
    res.locals.user = null;
    res.locals.globalUser = null;
    req.user = null;
    req.authUser = null;

    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
        return next();
    }

    try {
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(payloadStr);
        const userId = payload.sub;

        // --- INSTANT AUTOMATIC INVALIDATION ---
        // Jika user melakukan POST/PUT/PATCH (update data), kita langsung buang cache-nya
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            global.kuppaMemory.delete(userId); 
            // Kita juga intercept saat response selesai untuk memastikan cache bersih
            const originalEnd = res.end;
            res.end = function (chunk, encoding) {
                global.kuppaMemory.delete(userId);
                originalEnd.call(this, chunk, encoding);
            };
        }

        // --- CACHE LOOKUP ---
        const cachedData = global.kuppaMemory.get(userId);
        if (cachedData) {
            req.user = cachedData.dbUser;
            req.authUser = cachedData.authUser;
            res.locals.user = cachedData.dbUser;
            res.locals.globalUser = cachedData.globalUser;
            return next();
        }

        // --- FETCH DATA (Jika cache kosong/dihapus) ---
        const [authRes, dbRes] = await Promise.all([
            supabase.auth.getUser(token),
            supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .eq('id', userId)
                .single()
        ]);

        const { data: authData, error: authError } = authRes;
        const { data: dbUser, error: dbError } = dbRes;
        const authUser = authData ? authData.user : null;

        if (!authError && authUser && dbUser) {
            let avatarUrl = dbUser.avatar_url;
            if (avatarUrl && !avatarUrl.startsWith('http')) {
                avatarUrl = avatarUrl.startsWith('/uploads/') ? avatarUrl : `/uploads/${avatarUrl}`;
            }

            const globalUserData = { 
                name: dbUser.full_name || 'User', 
                email: dbUser.email,
                avatar: avatarUrl || '/assets/img/default-avatar.png'
            };

            // Sync ke request
            req.user = dbUser;
            req.authUser = authUser;
            res.locals.user = dbUser;
            res.locals.globalUser = globalUserData;

            // Simpan ke memory untuk request GET berikutnya
            global.kuppaMemory.set(userId, {
                dbUser,
                authUser,
                globalUser: globalUserData
            });

        } else if (authError) {
            res.clearCookie('Kuppa_session', { path: '/' });
            global.kuppaMemory.delete(userId);
        }
    } catch (err) {
        if (global.process.env.APP_DEBUG === 'true') {
            console.error('[GlobalMiddleware Error]:', err.message);
        }
    }
    
    return next();
};