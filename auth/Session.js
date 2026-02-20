/**
 * Kuppa Engine - Session Manager
 * Optimized by Ketut Dana
 */
class Session {
    /**
     * Get Session Lifetime from ENV or default to 1 Hour
     */
    static get lifetime() {
        // Use 1 hour as default if SESSION_LIFETIME is not set in .env
        const hours = global.process.env.SESSION_LIFETIME || 1;
        return parseInt(hours) * 60 * 60 * 1000;
    }

    /**
     * Create a secure session cookie
     * @param {Object} res - Express Response object
     * @param {string} token - Access token
     */
    static create(res, token) {
        const isProduction = global.process.env.APP_DEBUG === 'false';

        return res.cookie('Kuppa_session', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: this.lifetime
        });
    }

    /**
     * Destroy session cookie
     * @param {Object} res - Express Response object
     */
    static destroy(res) {
        return res.clearCookie('Kuppa_session');
    }
}

module.exports = Session;