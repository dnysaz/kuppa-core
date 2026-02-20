const SchemaBuilder = require('./SchemaBuilder');
const { supabase } = coreFile('config.Database');

/**
 * kuppa.js Base Migration Engine
 * Serious & Fast Schema Definition
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
            // Pastikan tabel: kuppa_migrations, kolom: migration
            const { data, error } = await supabase
                .from('kuppa_migrations')
                .select('id')
                .eq('migration', fileName)
                .maybeSingle(); // Menggunakan maybeSingle agar tidak throw error jika kosong
            
            return !!data;
        } catch (e) {
            console.error(`[kuppa] Check failed for ${fileName}:`, e.message);
            return false;
        }
    }

    /**
     * Record the migration success
     */
    async markAsMigrated(fileName) {
        // Harus insert ke tabel yang sama: kuppa_migrations
        const { error } = await supabase
            .from('kuppa_migrations')
            .insert([{ 
                migration: fileName, 
                batch: 1 
            }]);
        
        if (error) {
            console.error(`[kuppa] Failed to record migration: ${error.message}`);
        }
    }
}

module.exports = Migration;