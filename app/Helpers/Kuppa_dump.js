/**
 * kuppa Engine - Die and Dump Debugger
 * Optimized by Ketut Dana
 */
global.fxd = global.dump = (data) => {
    const stackLines = new Error().stack.split('\n');
    const stack = stackLines[2] ? stackLines[2].trim() : 'unknown location';
    
    let displayData;
    try {
        if (data instanceof Error) {
            displayData = JSON.stringify({
                message: data.message,
                stack: data.stack,
                ...data
            }, null, 4);
        } else {
            displayData = JSON.stringify(data, null, 4);
        }
    } catch (e) {
        displayData = "[Circular Reference or Unstringifiable Data]";
    }

    const appName = process.env.APP_NAME || 'kuppa.js';
    const appVersion = process.env.APP_VERSION || '0.0.0';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>kuppa Dump</title>
        <style>
            body { 
                margin: 0; 
                color: #000; 
                background: #fff; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                min-height: 100vh; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: flex-start;
                position: relative; 
                padding-top: 50px;
            }
            .dump-wrapper { max-width: 80%; width: 100%; padding-bottom: 100px; }
            .header { display: flex; align-items: center; margin-bottom: 20px; }
            h1 { border-right: 1px solid rgba(0, 0, 0, .3); margin: 0 20px 0 0; padding: 0 23px 0 0; font-size: 24px; font-weight: 500; }
            h2 { font-size: 14px; font-weight: 400; line-height: 28px; margin: 0; color: #666; font-family: monospace; word-break: break-all; }
            pre { background: #f4f4f7; padding: 20px; border-radius: 8px; color: #d63384; font-size: 13px; line-height: 1.5; overflow-x: auto; border: 1px solid #e1e4e8; margin: 0; }
            .footer-brand { position: fixed; bottom: 24px; left: 24px; right: 24px; display: flex; justify-content: space-between; color: #d1d5db; font-size: 12px; font-weight: 500; background: rgba(255,255,255,0.8); }
            .footer-brand span { color: #9ca3af; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="dump-wrapper">
            <div class="header">
                <h1>Kuppa Dump</h1>
                <div><h2>${stack}</h2></div>
            </div>
            <pre>${displayData}</pre>
        </div>
        <div class="footer-brand">
            <div>${appName} <span>v${appVersion}</span></div>
            <div>Node.js <span>${process.version}</span></div>
        </div>
    </body>
    </html>`;

    const err = new Error('KUPPA_DUMP');
    err.dumpData = html;
    throw err;
};