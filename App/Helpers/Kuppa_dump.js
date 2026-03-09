/**
 * Kuppa.js Engine - Die and Dump Debugger
 * Optimized by Ketut Dana
 */

global.kuppa = global.dump = global.dd = (data) => {
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

    const appName = process.env.APP_NAME || 'Kuppa.js';
    const appVersion = process.env.APP_VERSION || '1.0.0';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kuppa Dump</title>
        <style>
            body { 
                margin: 0; 
                color: #000; 
                background: #fff; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                padding: 80px 40px;
                display: flex;
                flex-direction: column;
                align-items: flex-start; /* Tetap di kiri atas */
            }
            .header-wrapper {
                display: flex;
                align-items: center;
                margin-bottom: 40px;
                padding-left: 10px;
            }
            h1 {
                border-right: 1px solid rgba(0, 0, 0, .3);
                margin: 0 20px 0 0;
                padding: 0 23px 0 0;
                font-size: 24px;
                font-weight: 600;
                line-height: 32px;
            }
            .stack-info h2 {
                font-size: 14px;
                font-weight: 400;
                margin: 0;
                color: #666;
                font-family: ui-monospace, Menlo, monospace;
            }
            .dump-box {
                width: 100%;
                max-width: 1200px;
            }
            pre {
                margin: 0;
                font-family: ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Courier New", monospace;
                font-size: 14px;
                line-height: 1.6;
                tab-size: 4;
                white-space: pre-wrap;
                word-break: break-all;
            }
            .footer {
                position: fixed;
                bottom: 24px;
                left: 40px;
                right: 40px;
                display: flex;
                justify-content: space-between;
                color: #a1a1a1;
                font-size: 12px;
                border-top: 1px solid #f0f0f0;
                padding-top: 16px;
            }
            .footer b { color: #000; }
        </style>
    </head>
    <body>
        <div class="header-wrapper">
            <h1>Die and Dump Debugger</h1>
            <div class="stack-info">
                <h2>${stack}</h2>
            </div>
        </div>
        <div class="dump-box">
            <pre>${displayData}</pre>
        </div>
        <div class="footer">
            <div><b>${appName}</b> v${appVersion}</div>
            <div>Node.js <span>${process.version}</span></div>
        </div>
    </body>
    </html>`;

    const err = new Error('KUPPA_DUMP');
    err.dumpData = html;
    throw err;
};