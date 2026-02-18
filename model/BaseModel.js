const { supabase } = require('../config/Database');

// Persistent cache storage
global.kuppaCache = global.kuppaCache || {};

/**
 * kuppa Engine - BaseModel
 * Optimized Eloquent-style ORM with Smart Cache & Security
 */
class BaseModel {
    constructor(tableName) {
        this.table = tableName;
        this.queryInstance = null;
        this.cacheTTL = 5000; // 5 seconds (Cukup untuk performa, pendek untuk akurasi)
        this.fillable = [];    
    }

    /**
     * Filter payload based on allowed columns
     */
    _filterFillable(payload) {
        if (!this.fillable || this.fillable.length === 0) return payload;

        return Object.keys(payload)
            .filter(key => this.fillable.includes(key))
            .reduce((obj, key) => {
                obj[key] = payload[key];
                return obj;
            }, {});
    }

    /**
     * Initialize or get the current query builder
     */
    _getQuery() {
        if (!this.queryInstance) {
            this.queryInstance = supabase.from(this.table).select('*');
        }
        return this.queryInstance;
    }

    /**
     * Clear all cache related to this table
     */
    _clearTableCache() {
        const prefix = `${this.table}:`;
        Object.keys(global.kuppaCache).forEach(key => {
            if (key.startsWith(prefix)) {
                delete global.kuppaCache[key];
            }
        });
    }

    // --- QUERY BUILDERS ---

    where(column, value) {
        this._getQuery().eq(column, value);
        return this;
    }

    orderBy(column, { ascending = true } = {}) {
        this._getQuery().order(column, { ascending });
        return this;
    }

    limit(count) {
        this._getQuery().limit(count);
        return this;
    }

    // --- FETCH METHODS ---

    async get() {
        try {
            const { data, error } = await this._getQuery();
            this.queryInstance = null; // Reset builder
            if (error) throw error;
            return data;
        } catch (error) {
            this.queryInstance = null;
            throw error;
        }
    }

    async first() {
        try {
            const { data, error } = await this._getQuery().single();
            this.queryInstance = null;
            
            // Handle error 'no rows found' gracefully
            if (error && error.code === 'PGRST116') return null;
            if (error) throw error;
            
            return data;
        } catch (error) {
            this.queryInstance = null;
            throw error;
        }
    }

    async find(id) {
        const cacheKey = `${this.table}:id:${id}`;
        const now = Date.now();

        // Check Cache
        if (global.kuppaCache[cacheKey] && (now - global.kuppaCache[cacheKey].time < this.cacheTTL)) {
            return global.kuppaCache[cacheKey].data;
        }

        const data = await this.where('id', id).first();
        
        if (data) {
            global.kuppaCache[cacheKey] = { data: data, time: now };
        }
        
        return data;
    }

    async all() {
        return await this.get();
    }

    // --- PERSISTENCE METHODS ---

    async create(payload) {
        this.queryInstance = null;
        const cleanPayload = this._filterFillable(payload);

        const { data, error } = await supabase
            .from(this.table)
            .insert([cleanPayload])
            .select()
            .single();
        
        if (error) throw error;
        
        this._clearTableCache();
        return data;
    }

    async update(id, payload) {
        this.queryInstance = null;
        const cleanPayload = this._filterFillable(payload);

        const { data, error } = await supabase
            .from(this.table)
            .update(cleanPayload)
            .eq('id', id)
            .select(); 
        
        if (error) throw error;

        this._clearTableCache();
        return (data && data.length > 0) ? data[0] : null;
    }

    async delete(id) {
        this.queryInstance = null;
        const { error } = await supabase
            .from(this.table)
            .delete()
            .eq('id', id);
        
        if (error) throw error;

        this._clearTableCache();
        return true;
    }
}

module.exports = BaseModel;