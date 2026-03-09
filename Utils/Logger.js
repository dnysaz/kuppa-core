'use strict'

const fs   = require('fs');
const path = require('path');

/**
 * Kuppa Logger Service - Vercel Optimized
 */
class Logger {
    constructor() {
        // Mendeteksi apakah aplikasi berjalan di Vercel atau tidak
        this.isVercel = process.env.VERCEL === '1';
        this.logDir = path.join(process.cwd(), 'Storage/Logs');
        
        // Hanya jalankan pengecekan direktori jika di luar Vercel
        if (!this.isVercel) {
            this.ensureDirectoryExists();
        }
    }

    ensureDirectoryExists() {
        if (!fs.existsSync(this.logDir)) {
            try {
                fs.mkdirSync(this.logDir, { recursive: true });
            } catch (err) {
                console.error('Kuppa Logger: Gagal membuat folder log:', err);
            }
        }
    }

    formatMessage(level, message) {
        const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        return `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
    }

    write(level, message) {
        const formatted = this.formatMessage(level, message);

        // Jika di Vercel, cukup arahkan ke console.log
        // Vercel akan otomatis menangkap ini di tab 'Logs' dashboard
        if (this.isVercel) {
            if (level === 'error') console.error(formatted);
            else if (level === 'warn') console.warn(formatted);
            else console.log(formatted);
            return;
        }

        // Jika di luar Vercel (Lokal/VPS), tulis ke file
        const fileName = `${new Date().toISOString().split('T')[0]}.log`;
        const filePath = path.join(this.logDir, fileName);

        fs.appendFile(filePath, formatted, (err) => {
            if (err) console.error('Failed to write log to file:', err);
        });
    }

    info(msg) { this.write('info', msg); }
    error(msg) { this.write('error', msg); }
    warn(msg) { this.write('warn', msg); }
}

module.exports = new Logger();