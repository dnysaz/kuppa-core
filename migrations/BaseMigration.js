const SchemaBuilder = require('./SchemaBuilder');

/**
 * kuppa.js Base Migration Engine
 * Serious & Fast Schema Definition
 */
class Migration {
    /**
     * Create a new table on the schema.
     * Automatically handles RLS and Public Access Policies for Supabase.
     */
    createTable(tableName, callback) {
        const table = new SchemaBuilder();
        callback(table);
        
        // 1. Generate standard table creation SQL
        const tableSql = table.build(tableName);
        
        // 2. Generate RLS and Policy SQL
        const rlsSql = `
            -- Enable Row Level Security
            ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;

            -- Create Public Access Policy (Safe for Server-side Apps)
            -- This ensures data is readable/writable by the framework immediately
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable access for all' AND polrelid = 'public.${tableName}'::regclass) THEN
                    CREATE POLICY "Enable access for all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);
                END IF;
            END $$;
        `;

        // Combine both SQL strings
        return `${tableSql} ${rlsSql}`;
    }

    /**
     * Drop a table from the schema.
     */
    dropTable(tableName) {
        return `DROP TABLE IF EXISTS ${tableName} CASCADE;`;
    }

    /**
     * Rename an existing table.
     */
    renameTable(from, to) {
        return `ALTER TABLE ${from} RENAME TO ${to};`;
    }

    /**
     * Add or Modify columns (Manual SQL Fallback)
     */
    raw(sql) {
        return sql;
    }
}

module.exports = Migration;