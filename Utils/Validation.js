/**
 * Kuppa Engine - Validation Utility
 * Inspired by Laravel Validation
 * Optimized by Ketut Dana
 */
const Validator = require('validatorjs');

class Validation {
    /**
     * Validate data against rules
     * @param {Object} data - The data to validate (usually process.body)
     * @param {Object} rules - Validation rules (e.g., { email: 'required|email' })
     * @param {Object} customMessages - Optional custom error messages
     */
    static make(data, rules, customMessages = {}) {
        const validation = new Validator(data, rules, customMessages);
        
        // Return object with helper methods
        return {
            fails: () => validation.fails(),
            passes: () => validation.passes(),
            errors: () => validation.errors.all(), // Returns all errors
            firstError: () => {
                const allErrors = validation.errors.all();
                const keys = Object.keys(allErrors);
                return keys.length > 0 ? allErrors[keys[0]][0] : null;
            }
        };
    }
}

module.exports = Validation;