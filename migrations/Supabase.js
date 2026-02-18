const { supabase } = require('../config/Database');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Helper: Terminal Confirmation Interface
 */
const askConfirmation = (question) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`\x1b[41m\x1b[37m[ WARNING ]\x1b[0m \x1b[31m${question}\x1b[0m (yes/no): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes');
        });
    });
};

/**
 * kuppa Migration Engine - Production Ready with Status Feature
 */
module.exports = async (mode = 'up') => {
    const args = process.argv.slice(2);
    const isForced = args.includes('--force');
    const appStatus = process.env.APP_STATUS || 'development';

    // 1. Safety Guard for Production
    if (appStatus === 'production' && !isForced && mode !== 'status') {
        if (mode === 'up' || mode === 'fresh' || mode === 'down') {
            const confirmed = await askConfirmation(`Application in PRODUCTION mode. Proceed with ${mode.toUpperCase()}?`);
            if (!confirmed) {
                console.log('\x1b[33m[kuppa]\x1b[0m Migration aborted by user.');
                process.exit(0);
            }
        }
    }

    const migrationPath = path.join(process.cwd(), 'app/migrations');

    if (!fs.existsSync(migrationPath)) {
        console.log('\x1b[31m[kuppa]\x1b[0m Folder app/migrations not found.');
        return;
    }

    // 2. Ensure tracking table exists
    const setupSql = `CREATE TABLE IF NOT EXISTS kuppa_migrations (
        id SERIAL PRIMARY KEY,
        migration TEXT NOT NULL,
        batch INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`;
    
    await supabase.rpc('kuppa_execute_sql', { sql_query: setupSql });

    // 3. Fetch migration history
    const { data: history } = await supabase.from('kuppa_migrations').select('*').order('id', { ascending: true });
    const migratedFiles = history ? history.map(h => h.migration) : [];
    const lastBatch = history && history.length > 0 ? Math.max(...history.map(h => h.batch)) : 0;

    let localFiles = fs.readdirSync(migrationPath).filter(f => f.endsWith('.js')).sort();

    // --- MODE: STATUS ---
    if (mode === 'status') {
        console.log('\n\x1b[1m\x1b[36m Migration Status:\x1b[0m');
        console.log('----------------------------------------------------------------------');
        console.log(` \x1b[1mRan?   |  Batch  |  Migration Name\x1b[0m`);
        console.log('----------------------------------------------------------------------');

        localFiles.forEach(file => {
            const historyItem = history ? history.find(h => h.migration === file) : null;
            const isRan = !!historyItem;
            const status = isRan ? '\x1b[32m  Yes\x1b[0m' : '\x1b[31m  No \x1b[0m';
            const batchNum = isRan ? historyItem.batch.toString().padStart(5, ' ') : '  N/A';
            console.log(`${status}   |  ${batchNum}  |  ${file}`);
        });
        
        console.log('----------------------------------------------------------------------\n');
        process.exit(0);
    }

    // --- PREPARE FILES FOR UP/DOWN/FRESH ---
    let filesToProcess = [...localFiles];

    if (mode === 'up') {
        filesToProcess = localFiles.filter(file => !migratedFiles.includes(file));
    } else if (mode === 'down') {
        const lastBatchFiles = history.filter(h => h.batch === lastBatch).map(h => h.migration);
        filesToProcess = localFiles.filter(f => lastBatchFiles.includes(f)).reverse();
    } else if (mode === 'fresh') {
        console.log('\x1b[33m[kuppa]\x1b[0m Fresh: Wiping all tables and migration history...');
        
        // Script SQL untuk menghapus SEMUA tabel di schema public secara otomatis
        const forceWipeSql = `
            DO $$ DECLARE
                r RECORD;
            BEGIN
                -- Mencari semua tabel di schema public
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    -- Menghapus dengan CASCADE untuk memutus relasi foreign key
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        `;

        const { error: wipeError } = await supabase.rpc('kuppa_execute_sql', { sql_query: forceWipeSql });
        
        if (wipeError) {
            console.error('\x1b[31m[kuppa] Wipe failed:\x1b[0m', wipeError.message);
            process.exit(1);
        }

        console.log('\x1b[32m[kuppa] Database wiped successfully. Re-starting migrations...\x1b[0m');
        return module.exports('up'); 
    }

    if (filesToProcess.length === 0) {
        console.log('\x1b[33m[kuppa]\x1b[0m Nothing to migrate.');
        process.exit(0);
    }

    console.log(`\x1b[36m[kuppa]\x1b[0m Starting database migration [Mode: ${mode.toUpperCase()}]...`);
    const currentBatch = lastBatch + 1;

    for (const file of filesToProcess) {
        try {
            const filePath = path.join(migrationPath, file);
            delete require.cache[require.resolve(filePath)];
            const migration = require(filePath);
            
            const sql = (mode === 'up') ? await migration.up() : await migration.down();

            const { error: execError } = await supabase.rpc('kuppa_execute_sql', { sql_query: sql });

            if (execError) {
                console.error(`\x1b[31m[kuppa] Error in ${file}:\x1b[0m`, execError.message);
                break; 
            }

            if (mode === 'up') {
                await supabase.from('kuppa_migrations').insert([{ migration: file, batch: currentBatch }]);
                console.log(`\x1b[32m[kuppa] Migrating:\x1b[0m ${file}`);
            } else {
                await supabase.from('kuppa_migrations').delete().eq('migration', file);
                console.log(`\x1b[31m[kuppa] Rolling back:\x1b[0m ${file}`);
            }

        } catch (err) {
            console.error(`\x1b[31m[kuppa] Failed to process ${file}:\x1b[0m`, err.message);
            break;
        }
    }

    console.log('\x1b[36m[kuppa]\x1b[0m Database migration finished.');
    process.exit(0);
};