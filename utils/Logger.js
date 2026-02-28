'use strict'

const fs = require('fs');
const path = require('path');

/**
 * Kuppa Logger Service
 */
class Logger {
    constructor() {
        this.logDir = path.join(process.cwd(), 'storage/logs');
        this.ensureDirectoryExists();
    }

    ensureDirectoryExists() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message) {
        const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        return `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
    }

    write(level, message) {
        const fileName = `${new Date().toISOString().split('T')[0]}.log`;
        const filePath = path.join(this.logDir, fileName);
        const formatted = this.formatMessage(level, message);

        // Write to File (Append mode)
        fs.appendFile(filePath, formatted, (err) => {
            if (err) console.error('Failed to write log:', err);
        });
    }

    info(msg) { this.write('info', msg); }
    error(msg) { this.write('error', msg); }
    warn(msg) { this.write('warn', msg); }
}

module.exports = new Logger();