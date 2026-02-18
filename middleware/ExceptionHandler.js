const path = require('path');

/**
 * ExceptionHandler - kuppa Core Engine
 * Lokasi: core/Middleware/ExceptionHandler.js
 */
module.exports = (err, req, res, next) => {
    // --- 1. HANDLE kuppa() DUMP (Paling Atas agar Cepat) ---
    if (err.message === 'kuppa_DUMP') {
        return res.status(200).send(err.dumpData);
    }

    const isDebug = process.env.APP_DEBUG === 'true';
    const statusCode = err.status || 500;

    // Log error ke konsol server dengan warna merah agar mencolok
    console.error(`\x1b[31m[kuppa Error]\x1b[0m: ${err.message}`);

    // Mapping Status Message untuk Production
    const statusMessages = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'This page could not be found',
        405: 'Method Not Allowed',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'An unexpected error has occurred',
        503: 'Service Unavailable'
    };

    const statusMessage = statusMessages[statusCode] || 'An error occurred';

    // --- 2. TAMPILAN DEBUG (Development) ---
    if (isDebug) {
        const debugViewPath = path.join(__dirname, '../views/errors/debug.hbs');

        return res.status(statusCode).render(debugViewPath, {
            layout: false,
            title: `${statusCode} | ${err.message}`,
            message: err.message,
            stack: err.stack,
            status: statusCode,
            statusText: err.statusText || statusMessage, 
            path: req.path,
            method: req.method,
            timestamp: new Date().toLocaleString(),
            appName: process.env.APP_NAME || 'kuppa.js',
            appVersion: process.env.APP_VERSION || '0.0.0',
            nodeVersion: process.version
        });
    }

    // --- 3. TAMPILAN MINIMALIS (Production) ---
    const appName = process.env.APP_NAME || 'kuppa.js';
    const appVersion = process.env.APP_VERSION || '0.0.0';

    res.status(statusCode).send(`
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
                <div>Node.js <span>${process.version}</span></div>
            </div>
        </body>
        </html>
    `);
};