'use strict'

const Logger = coreFile('Utils.Logger');

module.exports = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        setImmediate(() => {
            const duration = Date.now() - start;

            // Logika pendeteksian user yang lebih cerdas
            let userIdentifier = '[Guest]';
            
            if (req.user) {
                // Jika sudah melewati Auth Middleware (Passport/Custom)
                userIdentifier = `[User:${req.user.id || req.user}]`;
            } else if (req.session) {
                // Cek berbagai kemungkinan key session
                const sessionUser = req.session.user_id || (req.session.user ? req.session.user.id : null);
                if (sessionUser) {
                    userIdentifier = `[User:${sessionUser}]`;
                }
            }

            const ua = req.get('User-Agent') || 'Unknown';
            const message = `${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms - IP: ${req.ip} - ${userIdentifier} - UA: ${ua}`;
            
            if (res.statusCode >= 400) {
                Logger.error(message);
            } else {
                Logger.info(message);
            }
        });
    });

    next();
};