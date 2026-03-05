/**
 * BaseApiController - Kuppa Framework
 * Standardizing JSON responses & Auth validation
 */
class BaseApiController {
    
    /**
     * Helper Auth (Instance method)
     * Sekarang memanggil static method dengan BaseApiController
     */
    auth(process) {
        if (!process.req.user) {
            // Memanggil static method melalui Class Name
            BaseApiController.unauthorized(process.res, 'Token is required to access this resource.');
            return null;
        }
        return process.req.user;
    }

    static success(res, data = null, message = 'Request successful', code = 200) {
        return res.status(code).json({ status: 'success', message: message, data: data });
    }

    static error(res, message = 'An error occurred', code = 500, errors = null) {
        return res.status(code).json({ status: 'error', message: message, errors: errors });
    }

    static notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404);
    }

    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401);
    }
}

module.exports = BaseApiController;