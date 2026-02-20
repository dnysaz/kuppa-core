const path = require('path');
const fs = require('fs');

/**
 * ExceptionHandler - Kuppa.js Core Engine
 * Location: core/middleware/ExceptionHandler.js
 * Optimized by Ketut Dana
 */
module.exports = (err, req, res, next) => {
    // --- 1. HANDLE Kuppa Dump (Die and Dump) ---
    // Immediate return to ensure dd() data is sent without further processing
    if (err.message === 'KUPPA_DUMP') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(err.dumpData);
    }

    const isDebug = global.process.env.APP_DEBUG === 'true';
    const statusCode = err.status || 500;

    // Log error to server console for monitoring
    console.error(`\x1b[31m[Kuppa Error]\x1b[0m: ${err.message}`);

    // Complete HTTP Status Messages 400-503
    const statusMessages = {
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'This page could not be found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Timeout',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Payload Too Large',
        414: 'URI Too Long',
        415: 'Unsupported Media Type',
        416: 'Range Not Satisfiable',
        417: 'Expectation Failed',
        418: "I'm a teapot",
        421: 'Misdirected Request',
        422: 'Unprocessable Entity',
        423: 'Locked',
        424: 'Failed Dependency',
        425: 'Too Early',
        426: 'Upgrade Required',
        428: 'Precondition Required',
        429: 'Too Many Requests',
        431: 'Request Header Fields Too Large',
        451: 'Unavailable For Legal Reasons',
        500: 'An unexpected error has occurred',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable'
    };

    const statusMessage = statusMessages[statusCode] || 'An error occurred';

    // --- 2. TAMPILAN DEBUG (Development Mode) ---
    if (isDebug) {
        /**
         * Note: Using absolute path to core/views to avoid lookup issues.
         * We check the existence of debug.hbs to prevent recursive errors.
         */
        const debugViewPath = path.join(__dirname, '../views/errors/debug.hbs');

        if (fs.existsSync(debugViewPath)) {
            return res.status(statusCode).render(debugViewPath, {
                layout: false, // Ensure we don't use the standard app layout
                title: `${statusCode} | ${err.message}`,
                message: err.message,
                stack: err.stack,
                status: statusCode,
                statusText: err.statusText || statusMessage, 
                path: req.path,
                method: req.method,
                timestamp: new Date().toLocaleString(),
                appName: global.process.env.APP_NAME || 'Kuppa.js',
                appVersion: global.process.env.APP_VERSION || '1.0.0',
                nodeVersion: global.process.version
            });
        }
    }

    // --- 3. TAMPILAN MINIMALIS (Production Mode) ---
    const appName = global.process.env.APP_NAME || 'Kuppa.js';
    const appVersion = global.process.env.APP_VERSION || '1.0.0';

    return res.status(statusCode).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${statusCode}: ${statusMessage}</title>
            <style>
                body { margin: 0; color: #000; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; }
                .error-wrapper { display: flex; align-items: center; }
                h1 { border-right: 1px solid rgba(0, 0, 0, .3); margin: 0 20px 0 0; padding: 0 23px 0 0; font-size: 24px; font-weight: 500; }
                h2 { font-size: 14px; font-weight: 400; line-height: 28px; margin: 0; }
                .footer-brand { position: absolute; bottom: 24px; left: 24px; right: 24px; display: flex; justify-content: space-between; color: #d1d5db; font-size: 12px; font-weight: 500; }
                .footer-brand span { color: #9ca3af; font-family: monospace; }
            </style>
        </head>
        <body>
            <div class="error-wrapper">
                <h1>${statusCode}</h1>
                <div><h2>${statusMessage}.</h2></div>
            </div>
            <div class="footer-brand">
                <div>${appName} <span>v${appVersion}</span></div>
                <div>Node.js <span>${global.process.version}</span></div>
            </div>
        </body>
        </html>
    `);
};