#!/usr/bin/env node
/**
 * fxd4 CLI - The "One Direction" Generator
 * Built by Ketut Dana
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
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

/**
 * Migration Timestamp Helper
 */
const getMigrationTimestamp = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

// --- Execution Logic ---

// Help Command - Strictly using Help.hbs
if (command === 'help' || !command || command === '--help') {
    console.log(getTemplate('Help'));
    process.exit(0);
}

// Migration Commands
if (command === 'migrate') {
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
        console.error('\x1b[31mError:\x1b[0m Please provide a name (e.g., fx make:model Blog).');
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
            
            const cContent = getTemplate(templateName, { 
                name: formattedName,
                name_lower: resourceName
            });
            createFile(targetDir, `${formattedName}.js`, cContent);
            break;

        case 'make:model':
            const tableLower = nameLower + 's';
            const mContent = getTemplate('Model', { 
                name: formattedName, 
                table: tableLower 
            });
            createFile('app/Models', `${formattedName}.js`, mContent);

            if (flags.includes('-m')) {
                const migName = `create_${tableLower}_table`;
                const className = migName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
                const migContent = getTemplate('Migration', { className, tableName: tableLower });
                createFile('app/migrations', `${getMigrationTimestamp()}_${migName}.js`, migContent);
            }
            break;

        case 'make:migration':
            const classNameMig = name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
            const tableNameMig = name.replace('create_', '').replace('_table', '');
            const migContentRaw = getTemplate('Migration', { className: classNameMig, tableName: tableNameMig });
            createFile('app/migrations', `${getMigrationTimestamp()}_${name}.js`, migContentRaw);
            break;

        case 'make:middleware':
            const midContent = getTemplate('Middleware', { name: formattedName });
            createFile('app/Middleware', `${formattedName}.js`, midContent);
            break;

        default:
            console.log('\x1b[31mError:\x1b[0m Unknown command. Type \x1b[1mfx help\x1b[0m for list of commands.');
    }
} else {
    console.log('\x1b[31mError:\x1b[0m Unknown command. Type \x1b[1mfx help\x1b[0m.');
}