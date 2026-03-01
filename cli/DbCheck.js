const Database = coreFile('config.Database');

module.exports = async (tableName = null) => {
    const supabase = Database.supabase || Database;

    const showSetupInstructions = () => {
        console.log('\n\x1b[31m[ERROR]\x1b[0m Database engine [kuppa_execute] not found.');
        console.log('\x1b[36mPlease run this SQL in your Supabase SQL Editor:\x1b[0m\n');
        console.log('\x1b[90m------------------------------------------------------------------\x1b[0m');
        console.log(`
CREATE OR REPLACE FUNCTION kuppa_execute(sql_query text)
RETURNS SETOF jsonb AS $$
BEGIN
    IF (UPPER(TRIM(sql_query)) LIKE 'SELECT%') THEN
        RETURN QUERY EXECUTE 'SELECT to_jsonb(t) FROM (' || sql_query || ') t';
    ELSE
        EXECUTE sql_query;
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION kuppa_execute(text) TO postgres, service_role, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.kuppa_migrations (
    id SERIAL PRIMARY KEY,
    migration TEXT NOT NULL UNIQUE,
    batch INTEGER NOT NULL,
    migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT ALL ON TABLE public.kuppa_migrations TO postgres, service_role, anon, authenticated;
GRANT ALL ON SEQUENCE public.kuppa_migrations_id_seq TO postgres, service_role, anon, authenticated;

ALTER TABLE public.kuppa_migrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kuppa allow all" ON public.kuppa_migrations;
CREATE POLICY "Kuppa allow all" ON public.kuppa_migrations 
FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
        `);
        console.log('\x1b[90m------------------------------------------------------------------\x1b[0m\n');
    };

    try {
        if (!tableName) {
            console.log('\x1b[36m[kuppa]\x1b[0m Fetching tables...');
            
            const query = "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC";
            const { data, error } = await supabase.rpc('kuppa_execute', { sql_query: query });

            if (error) {
                if (error.message.includes('kuppa_execute') || error.code === 'PGRST202') {
                    showSetupInstructions();
                } else {
                    console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
                }
            } else if (data) {
                if (data.length > 0) {
                    console.log('\n\x1b[1m\x1b[32m Database Tables:\x1b[0m');
                    console.table(data);
                    console.log('\x1b[90mTip: Run "node kuppa db [table_name]" to see columns.\x1b[0m\n');
                } else {
                    console.log('\x1b[33m[kuppa]\x1b[0m No tables found.');
                }
            }
        } else {
            const query = `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = 'public' ORDER BY ordinal_position`;
            
            const { data, error } = await supabase.rpc('kuppa_execute', { sql_query: query });

            if (error) {
                if (error.message.includes('kuppa_execute') || error.code === 'PGRST202') {
                    showSetupInstructions();
                } else {
                    console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
                }
            } else if (data && data.length > 0) {
                console.log(`\n\x1b[1m\x1b[32m Structure: ${tableName}\x1b[0m`);
                console.table(data);
            } else {
                console.log(`\x1b[31m[Error]:\x1b[0m Table "${tableName}" not found.`);
            }
        }
    } catch (err) {
        console.error(`\x1b[31m[Execution Error]:\x1b[0m ${err.message}`);
    }
    
    process.exit(0);
};