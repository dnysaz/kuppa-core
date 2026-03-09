/**
 * Str Utils - Kuppa Framework
 * String manipulation helpers
 */
class Str {
    /**
     * Generate a URL friendly slug
     */
    static slug(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')     // Replace spaces with -
            .replace(/[^\w\-]+/g, '') // Remove all non-word chars
            .replace(/\-\-+/g, '-');  // Replace multiple - with single -
    }

    /**
     * Random string generator
     */
    static random(length = 10) {
        return Math.random().toString(36).substring(2, length + 2);
    }
}

module.exports = Str;