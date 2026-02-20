const { supabase } = coreFile('config.Database');
const Provisioner = coreFile('migrations.Provisioner');

/**
 * kuppa Database Inspector
 * Final Stable Version
 */
module.exports = async (tableName = null) => {
    // Ensure the SQL engine is latest
    await Provisioner.setupSqlEngine();

    try {
        if (!tableName) {
            console.log('\x1b[36m[kuppa]\x1b[0m Fetching tables...');
            
            // Menggunakan query satu baris yang sudah terbukti sukses
            const query = "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC";

            const { data, error } = await supabase.rpc('kuppa_execute_sql', { 
                sql_query: query 
            });

            if (error) {
                console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
            } else if (data && Array.isArray(data) && data.length > 0) {
                console.log('\n\x1b[1m\x1b[32m Database Tables:\x1b[0m');
                console.table(data);
                console.log('\x1b[90mTip: Run "kuppa db [table_name]" to see columns.\x1b[0m\n');
            } else {
                console.log('\x1b[33m[kuppa]\x1b[0m No tables found in public schema.');
            }
        } else {
            // Mode Detail: Pastikan table_schema juga difilter ke 'public'
            // Ini untuk mencegah kolom dari schema 'auth' ikut muncul jika nama tabel sama
            const queryDesc = `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = 'public' ORDER BY ordinal_position`;
            
            const { data, error } = await supabase.rpc('kuppa_execute_sql', { 
                sql_query: queryDesc 
            });

            if (data && Array.isArray(data) && data.length > 0) {
                console.log(`\n\x1b[1m\x1b[32m Structure: ${tableName}\x1b[0m`);
                console.table(data);
            } else {
                console.log(`\x1b[31m[Error]:\x1b[0m Table "${tableName}" not found in public schema.`);
                if (error) console.error(error.message);
            }
        }
    } catch (err) {
        console.error(`\x1b[31m[Execution Error]:\x1b[0m ${err.message}`);
    }
    
    process.exit(0);
};