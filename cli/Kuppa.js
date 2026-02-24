#!/usr/bin/env node
/**
 * kuppa CLI - The "One Direction" Generator
 * Built by Ketut Dana
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const args = process.argv.slice(2);

const command = args[0]; 
const subCommand = args[1];
const flags = args.slice(1);

/**
 * Helpers
 */
const getTemplate = (templateName, data = {}) => {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
        console.error(`\x1b[31mError:\x1b[0m Template ${templateName}.hbs not found at ${templatePath}`);
        process.exit(1);
    }
    
    let content = fs.readFileSync(templatePath, 'utf8');
    
    for (const key in data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, data[key]);
    }
    return content;
};

const createFile = (dir, fileName, content) => {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });

    const filePath = path.join(fullDir, fileName);
    if (fs.existsSync(filePath)) {
        console.error(`\x1b[31mError:\x1b[0m File ${fileName} already exists.`);
        return false;
    }
    fs.writeFileSync(filePath, content);
    console.log(`\x1b[32mCreated:\x1b[0m ${dir}/${fileName}`);
    return true;
};

const getMigrationTimestamp = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

// --- Execution Logic ---

if (command === 'help' || !command || command === '--help') {
    console.log(getTemplate('Help'));
    process.exit(0);
}

/**
 * Route Listing Command
 * Scans routes/web.js for defined endpoints
 */
/**
 * Route Listing Command
 * Scans routes/web.js and routes/api.js for defined endpoints
 */
if (command === 'route:list') {
    const webPath = path.join(process.cwd(), 'routes/web.js');
    const apiPath = path.join(process.cwd(), 'routes/api.js');
    
    const files = [
        { name: 'WEB', path: webPath },
        { name: 'API', path: apiPath }
    ];

    console.log('\n\x1b[35m[ Kuppa Route List ]\x1b[0m');
    console.log(''.padEnd(50, '-'));
    console.log(`${'METHOD'.padEnd(10)} ${'PATH'.padEnd(30)} ${'GROUP'}`);
    console.log(''.padEnd(50, '-'));

    let hasRoute = false;

    files.forEach(file => {
        if (fs.existsSync(file.path)) {
            const content = fs.readFileSync(file.path, 'utf8');
            const routeRegex = /(?:router|route|app)\s*\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
            
            let match;
            while ((match = routeRegex.exec(content)) !== null) {
                hasRoute = true;
                const method = match[1].toUpperCase();
                const url = match[2];
                
                // Color mapping
                let color = '\x1b[32m'; // GET - Green
                if (method === 'POST') color = '\x1b[33m';   // Yellow
                if (method === 'DELETE') color = '\x1b[31m'; // Red
                if (method === 'PUT' || method === 'PATCH') color = '\x1b[34m'; // Blue
                
                // Print formatted line
                console.log(`${color}${method.padEnd(10)}\x1b[0m ${url.padEnd(30)} \x1b[90m${file.name}\x1b[0m`);
            }
        }
    });

    if (!hasRoute) {
        console.log('   No routes found in routes/ directory.');
    }
    
    console.log(''.padEnd(50, '-').concat('\n'));
    process.exit(0);
}


/**
 * Cache Management Command
 * Clears in-memory cache (requires userCache export)
 */
else if (command === 'clear:cache') {
    console.log('\n\x1b[32m✔ Kuppa Auto-Cache is active.\x1b[0m');
    console.log('\x1b[90mNote: Cache is automatically cleared by GlobalMiddleware on every data update (POST/PUT/DELETE).\x1b[0m');
    console.log('\x1b[90mManual clearing is not required. Your data is always in-sync.\x1b[0m\n');
    process.exit(0);
}

/**
 * Maintenance Mode Commands (Up & Down)
 */
else if (command === 'down') {
    const maintenanceFile = path.join(process.cwd(), '.maintenance');
    fs.writeFileSync(maintenanceFile, JSON.stringify({ 
        down_at: new Date().toISOString(),
        message: subCommand || 'Service is under maintenance' 
    }));
    console.log('\x1b[31m●\x1b[0m Application is now in maintenance mode.');
    process.exit(0);
}

else if (command === 'up') {
    const maintenanceFile = path.join(process.cwd(), '.maintenance');
    if (fs.existsSync(maintenanceFile)) {
        fs.unlinkSync(maintenanceFile);
        console.log('\x1b[32m●\x1b[0m Application is now live.');
    } else {
        console.log('Application is already live.');
    }
    process.exit(0);
}

/**
 * Key Generator Command
 */
else if (command === 'key:generate') {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('\x1b[31mError:\x1b[0m .env file not found.');
        process.exit(1);
    }
    const newKey = crypto.randomBytes(32).toString('hex');
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('APP_KEY=')) {
        envContent = envContent.replace(/APP_KEY=.*/, `APP_KEY=${newKey}`);
    } else {
        envContent += `\nAPP_KEY=${newKey}`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`\x1b[32mApplication key set successfully.\x1b[0m`);
    console.log(`\x1b[34mKey:\x1b[0m ${newKey}`);
    process.exit(0);
}

// Database & SQL Commands
else if (command === 'sql') {
    require('./SqlRunner')();
} else if (command === 'db') {
    require('./DbCheck')(subCommand); 
}

// Migration Commands
else if (command === 'migrate') {
    require('../migrations/Supabase')('up');
} else if (command === 'migrate:rollback') {
    require('../migrations/Supabase')('down');
} else if (command === 'migrate:fresh') {
    require('../migrations/Supabase')('fresh');
} else if (command === 'migrate:status') {
    require('../migrations/Supabase')('status');
} 

// Generator Commands (make:*)
else if (command && command.startsWith('make:')) {
    const name = subCommand;
    if (!name) {
        console.error('\x1b[31mError:\x1b[0m Please provide a name (e.g., kuppa make:model Blog).');
        process.exit(1);
    }

    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const nameLower = name.toLowerCase();

    switch (command) {
        case 'make:controller':
            const isApi = flags.includes('--api');
            const resourceName = name.replace(/controller/gi, '').toLowerCase();
            const templateName = isApi ? 'ApiController' : 'Controller';
            const targetDir = isApi ? 'app/Controllers/Api' : 'app/Controllers';
            createFile(targetDir, `${formattedName}.js`, getTemplate(templateName, { name: formattedName, name_lower: resourceName }));
            break;

        case 'make:model':
            const tableLower = nameLower + 's';
            createFile('app/Models', `${formattedName}.js`, getTemplate('Model', { name: formattedName, table: tableLower }));
            if (flags.includes('-m')) {
                const migName = `create_${tableLower}_table`;
                const className = migName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
                createFile('app/Migrations', `${getMigrationTimestamp()}_${migName}.js`, getTemplate('Migration', { className, tableName: tableLower }));
            }
            break;

        case 'make:migration':
            const classNameMig = name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
            const tableNameMig = name.replace('create_', '').replace('_table', '');
            createFile('app/Migrations', `${getMigrationTimestamp()}_${name}.js`, getTemplate('Migration', { className: classNameMig, tableName: tableNameMig }));
            break;

        case 'make:middleware':
            createFile('app/Middleware', `${formattedName}.js`, getTemplate('Middleware', { name: formattedName }));
            break;

        default:
            console.log('\x1b[31mError:\x1b[0m Unknown command. Type \x1b[1mnode kuppa help\x1b[0m.');
    }
} else {
    console.log('\x1b[31mError:\x1b[0m Unknown command. Type \x1b[1mnode kuppa help\x1b[0m.');
}