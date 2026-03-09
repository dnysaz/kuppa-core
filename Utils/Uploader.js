'use strict';

const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const { supabase } = coreFile('Config.Database');

/**
 * Kuppa Uploader Wrapper - Smart Auto-Switching
 */
const runUploader = async (req, res, options = { folder: 'avatars', field: 'avatar' }) => {
    const location = process.env.STORAGE_LOCATION || 'local';
    const maxSize = parseInt(process.env.STORAGE_MAX_SIZE) || 2097152;
    const rootPath = process.env.STORAGE_PATH || 'Public/Uploads';
    const folder = options.folder || 'default';

    const storage = location === 'supabase' 
        ? multer.memoryStorage() 
        : multer.diskStorage({
            destination: (req, file, cb) => {
                const finalPath = path.join(process.cwd(), rootPath, folder);
                if (!fs.existsSync(finalPath)) fs.mkdirSync(finalPath, { recursive: true });
                cb(null, finalPath);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, uniqueSuffix + path.extname(file.originalname));
            }
        });

    const upload = multer({ 
        storage: storage,
        limits: { fileSize: maxSize }
    }).single(options.field || 'avatar');

    // Proses upload dengan penanganan error yang jelas
    const file = await new Promise((resolve, reject) => {
        upload(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                // Contoh: File terlalu besar (LIMIT_FILE_SIZE)
                return reject(new Error(`Upload Error: ${err.message}`));
            } else if (err) {
                return reject(err);
            }
            resolve(req.file);
        });
    });

    if (!file) return null;

    if (location === 'supabase' && file.buffer) {
        const fileName = `${folder}/${Date.now()}-${file.originalname}`;
        
        const { error } = await supabase.storage
            .from(folder)
            .upload(fileName, file.buffer, { 
                contentType: file.mimetype,
                upsert: true // Memungkinkan update file dengan nama yang sama
            });

        if (error) throw error;

        file.filename = supabase.storage.from(folder).getPublicUrl(fileName).data.publicUrl;
    } else {
        file.filename = file.filename;
    }

    return file;
};

module.exports = runUploader;