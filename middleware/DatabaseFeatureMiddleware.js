/**
 * DatabaseFeatureMiddleware - Kuppa Core Engine
 */
module.exports = (req, res, next) => {
    const useSupabase = process.env.USE_SUPABASE === 'true';
    const hasCredentials = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;

    if (!useSupabase || !hasCredentials) {
        const systemMessage = !useSupabase 
            ? 'Supabase feature is currently disabled in your configuration.' 
            : 'Database credentials missing. Please check your .env file.';

        res.locals.dbStatus = {
            isDisabled: true,
            message: systemMessage
        };

        if (req.path !== '/') {
            // Gunakan fungsi render error yang konsisten
            return res.status(403).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>403: ${!useSupabase ? 'Feature Disabled' : 'Database Connection Required'}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }</style>
                </head>
                <body class="bg-white text-black flex items-center justify-center min-h-screen">
                    <div class="flex items-center space-x-5 h-12">
                        <h1 class="text-2xl font-medium border-r border-neutral-300 pr-5 leading-none">403</h1>
                        <div class="flex flex-col">
                            <h2 class="text-sm font-normal leading-none">${systemMessage}</h2>
                        </div>
                    </div>
                    <div class="fixed bottom-10 w-full text-center">
                        <a href="/" class="text-[12px] text-neutral-400 hover:text-black transition-colors">
                            &larr; Back to Home
                        </a>
                    </div>
                </body>
                </html>
            `);
        }
    }

    next();
};