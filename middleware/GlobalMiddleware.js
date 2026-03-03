'use strict'

const { supabase } = require('../../core/config/Database');
const Logger = coreFile('utils.Logger');

// 1. Native Memory Storage (Zero Dependency)
if (!global.kuppaMemory) {
    global.kuppaMemory = new Map();
}

// 2. Performance Shield Storage
if (!global.kuppaShield) {
    global.kuppaShield = new Map();
}

/**
 * SHIELD GARBAGE COLLECTOR
 * Runs every 30 minutes to keep RAM lean.
 * Optimized by Ketut Dana for High-Performance.
 */
setInterval(() => {
    const now = Date.now();
    const expiry = 60 * 1000; // 1 minute
    let cleaned = 0;

    for (const [ip, data] of global.kuppaShield.entries()) {
        if (now - data.startTime > expiry) {
            global.kuppaShield.delete(ip);
            cleaned++;
        }
    }
    
    if (process.env.APP_DEBUG === 'true' && cleaned > 0) {
        console.log(`[Kuppa Shield]: Cleaned ${cleaned} expired IP entries.`);
    }
}, 30 * 60 * 1000);

/**
 * GlobalMiddleware - The Ultimate Version
 * Features: Performance Shield (Toggleable), Auth Cache, Auto Invalidation
 * Fixed: Flash Message Persistence & userRole Global Sync by Ketut Dana
 */
module.exports = async (req, res, next) => {
    // --- STEP 1: PERFORMANCE SHIELD (IP Rate Limiting) ---
    if (process.env.KUPPA_SHIELD === 'true') {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
        const now = Date.now();
        const windowMs = 60 * 1000; 
        const maxRequests = parseInt(process.env.KUPPA_SHIELD_MAX) || 1000;

        let ipData = global.kuppaShield.get(clientIp);

        if (!ipData || (now - ipData.startTime) > windowMs) {
            ipData = { count: 1, startTime: now };
        } else {
            ipData.count++;
        }

        global.kuppaShield.set(clientIp, ipData);

        if (ipData.count > maxRequests) {
            res.setHeader('Retry-After', 60);
            res.status(429);
            return res.render('shield/kuppa-shield', { 
                layout: false, 
                ip: clientIp,
                limit: maxRequests
            });
        }
    }

    // --- STEP 2: INITIALIZE LOCALS & AUTH ---
    const token = req.cookies.Kuppa_session;
    const urlPath = req.path;

    res.locals.currentRoute = urlPath === '/' ? 'home' : urlPath.split('/')[1];
    
    // FIX: Only initialize if not already set to prevent overwriting flash data
    if (res.locals.user === undefined) res.locals.user = null;
    if (res.locals.globalUser === undefined) res.locals.globalUser = null;
    if (res.locals.userRole === undefined) res.locals.userRole = null; // Initialize userRole

    // CIRCUIT BREAKER: Jika supabase null (saat testing), langsung skip ke next()
    if (!supabase || !token || typeof token !== 'string' || token.split('.').length !== 3) {
        return next();
    }

    try {
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(payloadStr);
        const userId = payload.sub;

        // --- STEP 3: AUTOMATIC CACHE INVALIDATION ---
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            global.kuppaMemory.delete(userId); 
        }

        // --- STEP 4: CACHE LOOKUP ---
        const cachedData = global.kuppaMemory.get(userId);
        if (cachedData) {
            req.user = cachedData.dbUser;
            req.authUser = cachedData.authUser;
            res.locals.user = cachedData.dbUser;
            res.locals.globalUser = cachedData.globalUser;
            res.locals.userRole = cachedData.userRole; // Get role from cache
            return next();
        }

        // --- STEP 5: FETCH DATA (Parallel Execution) ---
        const [authRes, dbRes] = await Promise.all([
            supabase.auth.getUser(token),
            supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url, role')
                .eq('id', userId)
                .single()
        ]);

        const { data: authData, error: authError } = authRes;
        const { data: dbUser, error: dbError } = dbRes;
        const authUser = authData?.user;

        if (!authError && authUser && dbUser) {
            let avatarUrl = dbUser.avatar_url;
            if (avatarUrl && !avatarUrl.startsWith('http')) {
                avatarUrl = avatarUrl.startsWith('/uploads/') ? avatarUrl : `${avatarUrl}`;
            }

            const globalUserData = { 
                name: dbUser.full_name || 'User', 
                email: dbUser.email,
                avatar: avatarUrl || '/assets/img/default-avatar.png',
                role: dbUser.role // Ensure role is in globalUserData
            };

            // SET KE REQUEST & LOCALS
            req.user = dbUser;
            req.authUser = authUser;
            res.locals.user = dbUser;
            res.locals.globalUser = globalUserData;
            res.locals.userRole = dbUser.role; // Crucial for navbar persistence

            global.kuppaMemory.set(userId, {
                dbUser,
                authUser,
                globalUser: globalUserData,
                userRole: dbUser.role 
            });

        } else if (authError) {
            res.clearCookie('Kuppa_session', { path: '/' });
            global.kuppaMemory.delete(userId);
        }

    } catch (err) {
        Logger.error(`[GlobalMiddleware Exception]: ${err.message}`);
    }

    if (res.locals.user) {
        req.session.user_id = res.locals.user.id;
    }
    
    return next();
};