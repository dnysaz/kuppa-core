const runUploader = require('../utils/Uploader');
const path = require('path');

/**
 * fxd4 Base Controller
 * The mother of all controllers
 */
class BaseController {
    /**
     * Helper untuk menangani upload file secara konsisten
     */
    async upload(process, options = { folder: 'general', field: 'file' }) {
        try {
            const file = await runUploader(process.req, process.res, options);
            if (file) {
                // Mengembalikan path yang sudah rapi untuk DB
                return path.join(options.folder, file.filename);
            }
            return null;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Shortcut untuk akses Axios (Sudah ada di process.http, 
     * tapi bisa kita bungkus lagi jika perlu)
     */
    get http() {
        return require('axios');
    }
}

module.exports = BaseController;