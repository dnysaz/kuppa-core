/**
 * Kuppa Engine - Session Manager
 * Optimized by Ketut Dana - Fixed Flash Persistence
 */
class Session {
    /**
     * Get Session Lifetime from ENV or default to 1 Hour
     */
    static get lifetime() {
        const hours = global.process.env.SESSION_LIFETIME || 1;
        return parseInt(hours) * 60 * 60 * 1000;
    }

    /**
     * Create a secure session cookie
     * @param {Object} res - Express Response object
     * @param {string} token - Access token
     */
    static create(res, token) {
        const isProduction = global.process.env.APP_STATUS === 'production';

        // 1. Set Auth Cookie (Untuk Supabase)
        res.cookie('Kuppa_session', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: this.lifetime
        });

        // 2. Pastikan express-session juga tersimpan
        // Tanpa ini, ID session bisa berubah dan flash message hilang
        if (res.req && res.req.session) {
            res.req.session.save();
        }
        
        return res;
    }

    /**
     * Destroy session cookie
     * @param {Object} res - Express Response object
     */
    static destroy(res) {
        res.clearCookie('Kuppa_session');
        if (res.req && res.req.session) {
            res.req.session.destroy();
        }
        return res;
    }
}

module.exports = Session;