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
        if (['up', 'fresh', 'down'].includes(mode)) {
            const confirmed = await askConfirmation(`Application in PRODUCTION mode. Proceed with ${mode.toUpperCase()}?`);
            if (!confirmed) {
                console.log('\x1b[33m[kuppa]\x1b[0m Migration aborted by user.');
                process.exit(0);
            }
        }
    }

    // Ensure we use the correct Case-Sensitive folder
    const migrationPath = path.join(process.cwd(), 'app/Migrations');

    if (!fs.existsSync(migrationPath)) {
        console.log('\x1b[31m[kuppa]\x1b[0m Folder app/Migrations not found.');
        return;
    }

    // 2. Ensure tracking table exists & DISABLE RLS for tracking only
    const setupSql = `
        CREATE TABLE IF NOT EXISTS kuppa_migrations (
            id SERIAL PRIMARY KEY,
            migration TEXT NOT NULL UNIQUE,
            batch INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        -- Bypass RLS to ensure engine can always read/write history
        ALTER TABLE kuppa_migrations DISABLE ROW LEVEL SECURITY;
    `;
    
    await supabase.rpc('kuppa_execute_sql', { sql_query: setupSql });

    // 3. Fetch migration history with strict error handling
    const { data: history, error: historyError } = await supabase
        .from('kuppa_migrations')
        .select('*')
        .order('id', { ascending: true });

    if (historyError) {
        console.error('\x1b[31m[kuppa] Error fetching history:\x1b[0m', historyError.message);
        process.exit(1);
    }

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
    let filesToProcess = [];

    if (mode === 'up') {
        // Strict filtering: Only files NOT in migratedFiles array
        filesToProcess = localFiles.filter(file => !migratedFiles.includes(file));
    } else if (mode === 'down') {
        const lastBatchFiles = history.filter(h => h.batch === lastBatch).map(h => h.migration);
        filesToProcess = localFiles.filter(f => lastBatchFiles.includes(f)).reverse();
    } else if (mode === 'fresh') {
        const confirmed = await askConfirmation("WIPE all tables and history?");
        if (!confirmed) process.exit(0);
        
        const forceWipeSql = `
            DO $$ DECLARE r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        `;
        await supabase.rpc('kuppa_execute_sql', { sql_query: forceWipeSql });
        console.log('\x1b[32m[kuppa] Database wiped. Re-starting...\x1b[0m');
        return module.exports('up'); 
    }

    // CHECK: Nothing to migrate
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

            // Execute table SQL
            const { error: execError } = await supabase.rpc('kuppa_execute_sql', { sql_query: sql });

            if (execError) {
                console.error(`\x1b[31m[kuppa] SQL Error in ${file}:\x1b[0m`, execError.message);
                break; 
            }

            // Update Log
            if (mode === 'up') {
                const { error: insertError } = await supabase
                    .from('kuppa_migrations')
                    .insert([{ migration: file, batch: currentBatch }]);

                if (insertError) {
                    console.error(`\x1b[31m[kuppa] Failed to record ${file}:\x1b[0m`, insertError.message);
                    break;
                }
                console.log(`\x1b[32m[kuppa] Migrated:\x1b[0m ${file}`);
            } else {
                await supabase.from('kuppa_migrations').delete().eq('migration', file);
                console.log(`\x1b[31m[kuppa] Rolling back:\x1b[0m ${file}`);
            }

        } catch (err) {
            console.error(`\x1b[31m[kuppa] Critical failure in ${file}:\x1b[0m`, err.message);
            break;
        }
    }

    console.log('\x1b[36m[kuppa]\x1b[0m Database migration finished.');
    process.exit(0);
};