/**
 * Kuppa Engine - Autoloading & Path Resolvers
 * Location: core/Autoload.js
 */
const path = require('path');

// Root directory of the project
const rootPath = path.join(__dirname, '../');

/**
 * Resolve files from the /core directory
 */
global.coreFile = (pathString) => {
    const cleanPath = pathString.replace(/\./g, '/');
    return require(path.join(rootPath, 'core', `${cleanPath}`));
};

/**
 * Resolve files from the /app directory
 */
global.appFile = (pathString) => {
    const cleanPath = pathString.replace(/\./g, '/');
    return require(path.join(rootPath, 'app', `${cleanPath}`));
};

/**
 * Helper for public assets or paths
 */
global.basePath = (subPath = '') => {
    return path.join(rootPath, subPath);
};