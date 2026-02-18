const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * fxd4 Uploader Wrapper
 * Optimized for Async/Await inside Controllers with Dynamic Pathing
 * * @param {Object} req - Express Request
 * @param {Object} res - Express Response
 * @param {Object} options - Configuration: { folder: 'subfolder', field: 'inputName' }
 */
const runUploader = (req, res, options = { folder: '', field: 'avatar' }) => {
    
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            // Base path from .env
            const rootPath = process.env.UPLOAD_PATH || 'public/uploads';
            // Join with sub-folder provided in options
            const finalPath = path.join(rootPath, options.folder || '');

            // Auto-create directory if not exists
            if (!fs.existsSync(finalPath)) {
                fs.mkdirSync(finalPath, { recursive: true });
            }

            cb(null, finalPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });

    // Initialize Multer with dynamic field name
    const upload = multer({ 
        storage: storage,
        limits: { 
            fileSize: parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024 
        }
    }).single(options.field || 'avatar');

    return new Promise((resolve, reject) => {
        upload(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return reject(new Error('File is too large. Max size is 2MB.'));
                    }
                }
                return reject(err);
            }
            resolve(req.file);
        });
    });
};

module.exports = runUploader;