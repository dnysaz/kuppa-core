const SchemaBuilder = require('./SchemaBuilder');
const { supabase } = coreFile('config.Database');

/**
 * kuppa.js Base Migration Engine
 * Serious & Fast Schema Definition
 * Updated for migrate:fresh stability by Ketut Dana
 */
class Migration {
    /**
     * Create a new table on the schema.
     */
    createTable(tableName, callback) {
        const table = new SchemaBuilder();
        callback(table);
        
        const tableSql = table.build(tableName);
        
        const rlsSql = `
            ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable access for all' AND polrelid = 'public.${tableName}'::regclass) THEN
                    CREATE POLICY "Enable access for all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);
                END IF;
            END $$;
        `;

        return `${tableSql} ${rlsSql}`;
    }

    dropTable(tableName) {
        return `DROP TABLE IF EXISTS ${tableName} CASCADE;`;
    }

    renameTable(from, to) {
        return `ALTER TABLE ${from} RENAME TO ${to};`;
    }

    raw(sql) {
        return sql;
    }

    // --- SYSTEM LOGIC (KONSISTENSI TABEL) ---

    /**
     * Check if this file has been migrated
     */
    async isMigrated(fileName) {
        try {
            const { data, error } = await supabase
                .from('kuppa_migrations')
                .select('id')
                .eq('migration', fileName)
                .maybeSingle();
            
            // Jika tabel tidak ada (Error PGRST116 atau 404), anggap belum dimigrasi
            if (error && (error.code === 'PGRST116' || error.message.includes('not find'))) {
                return false;
            }
            
            return !!data;
        } catch (e) {
            // Silence cache error during fresh migration
            return false;
        }
    }

    /**
     * Record the migration success
     */
    async markAsMigrated(fileName) {
        try {
            const { error } = await supabase
                .from('kuppa_migrations')
                .insert([{ 
                    migration: fileName, 
                    batch: 1 
                }]);
            
            if (error) {
                // Jika error karena tabel hilang (setelah fresh), coba buat dulu
                if (error.message.includes('not find')) {
                    await this.createSystemTable();
                    // Retry insert
                    await supabase.from('kuppa_migrations').insert([{ migration: fileName, batch: 1 }]);
                } else {
                    console.error(`[kuppa] Failed to record migration: ${error.message}`);
                }
            }
        } catch (e) {
            console.error(`[kuppa] System error recording migration: ${e.message}`);
        }
    }

    /**
     * Internal: Re-create migration table and FORCE cache reload
     */
    async createSystemTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS kuppa_migrations (
                id SERIAL PRIMARY KEY,
                migration VARCHAR(255) NOT NULL,
                batch INTEGER NOT NULL,
                migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            -- Force PostgREST to reload schema cache immediately
            NOTIFY pgrst, 'reload schema';
        `;
        
        return await supabase.rpc('execute_sql', { query: sql });
    }
}

module.exports = Migration;