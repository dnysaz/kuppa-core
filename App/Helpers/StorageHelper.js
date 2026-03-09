// core/helpers/StorageHelper.js

/**
 * Helper untuk normalisasi URL/Path secara otomatis
 * @param {string} filename - Nama file dari Uploader
 * @param {string} folder - Folder tujuan (contoh: '/avatars')
 */
const getFileUrl = (filename, folder = '/avatars') => {
    if (!filename) return null;
    
    // Jika sudah URL lengkap (Supabase), return langsung
    if (filename.startsWith('http')) {
        return filename;
    }
    
    // Ambil root path dari env agar user tidak perlu menulisnya manual
    const rootPath = process.env.STORAGE_PATH || 'Public/uploads';
    
    // Bersihkan path agar tidak double slash
    const cleanRoot = rootPath.replace('Public/', ''); 
    
    return `/${cleanRoot}${folder}/${filename}`.replace(/\/+/g, '/');
};

module.exports = { getFileUrl };