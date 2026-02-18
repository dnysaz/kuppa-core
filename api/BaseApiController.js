/**
 * BaseApiController - fxd4 Framework
 * Standardizing JSON responses for API routes
 */
class BaseApiController {
    /**
     * Send a success response
     * @param {Object} res - Express response object
     * @param {any} data - Data to return
     * @param {string} message - Success message
     * @param {number} code - HTTP Status Code
     */
    static success(res, data = null, message = 'Request successful', code = 200) {
        return res.status(code).json({
            status: 'success',
            message: message,
            data: data
        });
    }

    /**
     * Send an error response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     * @param {number} code - HTTP Status Code
     * @param {any} errors - Detailed validation errors
     */
    static error(res, message = 'An error occurred', code = 500, errors = null) {
        return res.status(code).json({
            status: 'error',
            message: message,
            errors: errors
        });
    }

    /**
     * Handle 404 Not Found specifically for API
     */
    static notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404);
    }

    /**
     * Handle 401 Unauthorized for API
     */
    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401);
    }
}

module.exports = BaseApiController;