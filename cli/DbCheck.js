/**
 * kuppa Database Inspector
 * Optimized by Ketut Dana
 * Handles missing RPC function and initialization errors with clear instructions
 */
const Database = coreFile('config.Database');
const Provisioner = coreFile('migrations.Provisioner');

module.exports = async (tableName = null) => {
    // Safety check for supabase instance
    const supabase = Database.supabase || Database;

    // SQL Helper for missing function or setup
    const showSetupInstructions = () => {
        console.log('\n\x1b[33m[!] Action Required:\x1b[0m SQL Helper function not found or Database not connected.');
        console.log('\x1b[36mPlease run this SQL in your Supabase SQL Editor to enable CLI Database Inspector:\x1b[0m\n');
        console.log('\x1b[90m------------------------------------------------------------------\x1b[0m');
        console.log(`
CREATE OR REPLACE FUNCTION kuppa_execute_sql(sql_query text)
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION kuppa_execute_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION kuppa_execute_sql(text) TO postgres;
        `);
        console.log('\x1b[90m------------------------------------------------------------------\x1b[0m\n');
    };

    // Ensure the SQL engine setup is called
    try {
        if (Provisioner && typeof Provisioner.setupSqlEngine === 'function') {
            await Provisioner.setupSqlEngine();
        }
    } catch (e) {
        // Silent fail for setup engine
    }

    // Validate Supabase RPC existence
    if (!supabase || typeof supabase.rpc !== 'function') {
        showSetupInstructions();
        process.exit(0);
    }

    try {
        if (!tableName) {
            console.log('\x1b[36m[kuppa]\x1b[0m Fetching tables...');
            
            // Note: We wrap result in json for better RPC compatibility
            const query = "SELECT json_build_object('tablename', tablename) as data FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC";

            const { data, error } = await supabase.rpc('kuppa_execute_sql', { 
                sql_query: query 
            });

            if (error) {
                // If the error indicates missing function, show instructions
                if (error.message.includes('kuppa_execute_sql') || error.code === 'PGRST202') {
                    showSetupInstructions();
                } else {
                    console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
                }
            } else if (data) {
                const tables = Array.isArray(data) ? data.map(item => item.data || item) : [];
                
                if (tables.length > 0) {
                    console.log('\n\x1b[1m\x1b[32m Database Tables:\x1b[0m');
                    console.table(tables);
                    console.log('\x1b[90mTip: Run "node kuppa db [table_name]" to see columns.\x1b[0m\n');
                } else {
                    console.log('\x1b[33m[kuppa]\x1b[0m No tables found in public schema.');
                    console.log('\x1b[36m[tip]\x1b[0m Run \x1b[1m"node kuppa migrate"\x1b[0m to create your first tables.\n');
                }
            }
        } else {
            const queryDesc = `SELECT json_build_object('column', column_name, 'type', data_type, 'nullable', is_nullable) as data FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = 'public' ORDER BY ordinal_position`;
            
            const { data, error } = await supabase.rpc('kuppa_execute_sql', { 
                sql_query: queryDesc 
            });

            if (error) {
                if (error.message.includes('kuppa_execute_sql') || error.code === 'PGRST202') {
                    showSetupInstructions();
                } else {
                    console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
                }
            } else if (data && Array.isArray(data) && data.length > 0) {
                const structure = data.map(item => item.data || item);
                console.log(`\n\x1b[1m\x1b[32m Structure: ${tableName}\x1b[0m`);
                console.table(structure);
            } else {
                console.log(`\x1b[31m[Error]:\x1b[0m Table "${tableName}" not found or empty in public schema.`);
            }
        }
    } catch (err) {
        // Check if error is related to RPC call on null
        if (err.message.includes('rpc')) {
            showSetupInstructions();
        } else {
            console.error(`\x1b[31m[Execution Error]:\x1b[0m ${err.message}`);
        }
    }
    
    process.exit(0);
};