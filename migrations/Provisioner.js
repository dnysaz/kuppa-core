const { supabase } = coreFile('config.Database');

/**
 * kuppa Database Provisioner
 * Serious & Aggressive Injection with Permission Grant
 */
class Provisioner {
    static async setupSqlEngine() {
        const sql = `
            -- 1. Drop existing to avoid type conflicts
            DROP FUNCTION IF EXISTS kuppa_execute_sql(text);

            -- 2. Create the function with JSONB return
            CREATE OR REPLACE FUNCTION kuppa_execute_sql(sql_query TEXT)
            RETURNS JSONB AS $$
            DECLARE
                result JSONB;
            BEGIN
                IF (LOWER(sql_query) LIKE 'select%') THEN
                    EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
                    RETURN result;
                ELSE
                    EXECUTE sql_query;
                    RETURN NULL;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Fallback for errors or DDL
                EXECUTE sql_query;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            -- 3. GRANT PERMISSIONS (This is the missing link)
            GRANT EXECUTE ON FUNCTION kuppa_execute_sql(text) TO postgres;
            GRANT EXECUTE ON FUNCTION kuppa_execute_sql(text) TO anon;
            GRANT EXECUTE ON FUNCTION kuppa_execute_sql(text) TO authenticated;
            GRANT EXECUTE ON FUNCTION kuppa_execute_sql(text) TO service_role;
        `.trim();

        try {
            // Karena kita tidak bisa menjalankan ini via RPC jika RPC-nya rusak/blind,
            // kita harus mengarahkan user untuk menjalankan ini di SQL Editor Dashboard sekali lagi.
            await supabase.rpc('kuppa_execute_sql', { sql_query: sql });
        } catch (e) {
            // Jika gagal, abaikan saja karena instruksi manual sudah diberikan.
        }
    }
}

module.exports = Provisioner;