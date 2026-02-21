/**
 * kuppa Database Inspector
 * Optimized by Ketut Dana
 * Handles missing RPC function with clear instructions
 */
const { supabase } = coreFile('config.Database');
const Provisioner = coreFile('migrations.Provisioner');

module.exports = async (tableName = null) => {
    // Ensure the SQL engine is latest
    await Provisioner.setupSqlEngine();

    // SQL Helper for missing function
    const showSetupInstructions = () => {
        console.log('\n\x1b[33m[!] Action Required:\x1b[0m SQL Helper function not found.');
        console.log('\x1b[36mPlease run this SQL in your Supabase SQL Editor to enable CLI Database Inspector:\x1b[0m\n');
        console.log('\x1b[90m------------------------------------------------------------------\x1b[0m');
        console.log(`
CREATE OR REPLACE FUNCTION kuppa_execute_sql(sql_query text)
RETURNS void AS $$
BEGIN
EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION kuppa_execute_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION kuppa_execute_sql(text) TO postgres;
        `);
        console.log('\x1b[90m------------------------------------------------------------------\x1b[0m\n');
    };

    try {
        if (!tableName) {
            console.log('\x1b[36m[kuppa]\x1b[0m Fetching tables...');
            
            const query = "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC";

            const { data, error } = await supabase.rpc('kuppa_execute_sql', { 
                sql_query: query 
            });

            if (error) {
                // Check if function is missing
                if (error.message.includes('kuppa_execute_sql') || error.code === 'PGRST202') {
                    showSetupInstructions();
                } else {
                    console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
                }
            } else if (data && Array.isArray(data)) {
                if (data.length > 0) {
                    console.log('\n\x1b[1m\x1b[32m Database Tables:\x1b[0m');
                    console.table(data);
                    console.log('\x1b[90mTip: Run "kuppa db [table_name]" to see columns.\x1b[0m\n');
                } else {
                    console.log('\x1b[33m[kuppa]\x1b[0m No tables found in public schema.');
                    console.log('\x1b[36m[tip]\x1b[0m Run \x1b[1m"kuppa migrate"\x1b[0m to create your first tables.\n');
                }
            }
        } else {
            const queryDesc = `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = 'public' ORDER BY ordinal_position`;
            
            const { data, error } = await supabase.rpc('kuppa_execute_sql', { 
                sql_query: queryDesc 
            });

            if (error) {
                if (error.message.includes('kuppa_execute_sql')) {
                    showSetupInstructions();
                } else {
                    console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
                }
            } else if (data && Array.isArray(data) && data.length > 0) {
                console.log(`\n\x1b[1m\x1b[32m Structure: ${tableName}\x1b[0m`);
                console.table(data);
            } else {
                console.log(`\x1b[31m[Error]:\x1b[0m Table "${tableName}" not found or empty in public schema.`);
            }
        }
    } catch (err) {
        console.error(`\x1b[31m[Execution Error]:\x1b[0m ${err.message}`);
    }
    
    process.exit(0);
};