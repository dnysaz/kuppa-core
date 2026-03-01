const { supabase } = coreFile('config.Database');
const readline = require('readline');

module.exports = async () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\x1b[36mkuppa-sql>\x1b[0m '
    });

    console.log('\x1b[1m\x1b[32mKuppa SQL Shell (Direct-Mode)\x1b[0m');
    console.log('\x1b[90mConnected to Supabase. Type "exit" to quit.\x1b[0m\n');

    rl.prompt();

    rl.on('line', async (line) => {
        const query = line.trim();
        if (!query) { rl.prompt(); return; }
        if (query.toLowerCase() === 'exit') { rl.close(); return; }

        try {
            // Update: Menggunakan fungsi 'kuppa_execute' yang baru
            const { data, error } = await supabase.rpc('kuppa_execute', { sql_query: query });

            if (error) {
                console.error(`\x1b[31m[SQL Error]:\x1b[0m ${error.message}`);
            } else {
                // Penanganan hasil query
                // Karena kuppa_execute sekarang mengembalikan JSON, 
                // data sudah dalam format yang siap diolah
                if (data && (Array.isArray(data) || typeof data === 'object') && Object.keys(data).length > 0) {
                    // Normalisasi data menjadi array agar console.table bekerja
                    const results = Array.isArray(data) ? data : [data];
                    
                    const formattedData = results.map(row => {
                        const newRow = {};
                        for (let key in row) {
                            let value = row[key];
                            newRow[key] = (typeof value === 'string' && value.length > 20) 
                                ? value.substring(0, 17) + '...' 
                                : value;
                        }
                        return newRow;
                    });
                    console.table(formattedData);
                } else {
                    console.log('\x1b[32mQuery executed successfully.\x1b[0m');
                }
            }
        } catch (err) {
            console.error(`\x1b[31m[Critical Error]:\x1b[0m ${err.message}`);
        }
        rl.prompt();
    }).on('close', () => {
        process.exit(0);
    });
};