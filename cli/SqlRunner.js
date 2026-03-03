const { supabase } = coreFile('config.Database');
const Provisioner = coreFile('migrations.Provisioner');
const readline = require('readline');

module.exports = async () => {
    // Force update engine every time entering shell
    await Provisioner.setupSqlEngine();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\x1b[36mkuppa-sql>\x1b[0m '
    });

    console.log('\x1b[1m\x1b[32mKuppa SQL Shell\x1b[0m');
    console.log('\x1b[90mConnected to Supabase. Type "exit" to quit.\x1b[0m\n');

    rl.prompt();

    rl.on('line', async (line) => {
        const query = line.trim();
        if (query.toLowerCase() === 'exit') { rl.close(); return; }
        if (!query) { rl.prompt(); return; }

        try {
            const { data, error } = await supabase.rpc('kuppa_execute_sql', { sql_query: query });

            if (error) {
                console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
            } else {
                // If data exists and is an array (SELECT result)
                if (data && Array.isArray(data)) {
                    if (data.length > 0) {
                        // Truncate long strings to keep table tidy
                        const formattedData = data.map(row => {
                            const newRow = {};
                            for (let key in row) {
                                let value = row[key];
                                // Limit to 25 chars for terminal readability
                                if (typeof value === 'string' && value.length > 15) {
                                    newRow[key] = value.substring(0, 15) + '...';
                                } else {
                                    newRow[key] = value;
                                }
                            }
                            return newRow;
                        });
                        console.table(formattedData);
                    } else {
                        console.log('\x1b[33mQuery executed: No rows returned.\x1b[0m');
                    }
                } else {
                    console.log('\x1b[32mQuery executed successfully.\x1b[0m');
                }
            }
        } catch (err) {
            console.error(`\x1b[31m[Execution Error]:\x1b[0m ${err.message}`);
        }
        rl.prompt();
    }).on('close', () => {
        process.exit(0);
    });
};