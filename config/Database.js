const { createClient } = require('@supabase/supabase-js');

/**
 * fxd4 Engine - Database Connection (High Performance)
 * Location: core/config/Database.js
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const useSupabase = process.env.USE_SUPABASE !== 'false'; // Default true jika tidak diatur

let supabase = null;

/**
 * Validasi tanpa process.exit(1) agar aplikasi tidak crash.
 * Memberikan peringatan ke konsol jika fitur database diaktifkan tapi kunci kosong.
 */
if (useSupabase) {
    if (!supabaseUrl || !supabaseKey) {
        console.warn('\x1b[33m%s\x1b[0m', '[fxd4 Warning]: SUPABASE_URL or SUPABASE_KEY is missing in .env.');
        console.warn('\x1b[33m%s\x1b[0m', 'Database features will be disabled until configured.');
    } else {
        /**
         * Singleton Pattern: Reuse the connection across serverless invocations.
         */
        if (!global.supabaseInstance) {
            try {
                global.supabaseInstance = createClient(supabaseUrl, supabaseKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                        detectSessionInUrl: false
                    },
                    global: {
                        headers: { 'x-application-name': 'fxd4.js' }
                    },
                    db: {
                        schema: 'public'
                    }
                });
            } catch (err) {
                console.error('\x1b[31m%s\x1b[0m', `[fxd4 Error]: Failed to initialize Supabase: ${err.message}`);
            }
        }
        supabase = global.supabaseInstance;
    }
}

// module.exports = supabase;
module.exports = { supabase };