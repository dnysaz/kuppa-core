const { supabase } = require('../config/Database');

// Persistent cache storage
global.kuppaCache = global.kuppaCache || {};

/**
 * kuppa Engine - BaseModel
 * Optimized Eloquent-style ORM with Smart Cache, Security & Relations
 */
class BaseModel {
    constructor(tableName) {
        this.table = tableName;
        this.queryInstance = null;
        this.cacheTTL = 5000; // 5 seconds default
        this.fillable = [];
        this.selectedColumns = '*';
    }

    /**
     * Filter payload based on allowed columns
     * @private
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
     * @private
     */
    _getQuery() {
        if (!this.queryInstance) {
            this.queryInstance = supabase.from(this.table).select(this.selectedColumns);
        }
        return this.queryInstance;
    }

    /**
     * Clear all cache related to this table (Invalidation)
     * @private
     */
    _clearTableCache() {
        const prefix = `${this.table}:`;
        Object.keys(global.kuppaCache).forEach(key => {
            if (key.startsWith(prefix)) {
                delete global.kuppaCache[key];
            }
        });
    }

    /**
     * Generic Cache Wrapper to reduce boilerplate
     * @private
     */
    async _withCache(cacheKey, fetchFunction) {
        const now = Date.now();
        const fullKey = `${this.table}:${cacheKey}:${this.selectedColumns}`;

        if (global.kuppaCache[fullKey] && (now - global.kuppaCache[fullKey].time < this.cacheTTL)) {
            return global.kuppaCache[fullKey].data;
        }

        const data = await fetchFunction();
        
        if (data) {
            global.kuppaCache[fullKey] = { data, time: now };
        }
        return data;
    }

    // --- RELATIONSHIP & SELECTION ---

    with(...relations) {
        if (relations.length > 0) {
            const relationString = relations.join(', ');
            this.selectedColumns = `*, ${relationString}`;
        }
        return this;
    }

    select(columns = '*') {
        this.selectedColumns = columns;
        return this;
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

    // --- SMART FETCH METHODS ---

    /**
     * Find by dynamic column
     * Usage: User.findBy('email', 'ketut@example.com')
     */
    async findBy(column, value) {
        return await this._withCache(`findBy:${column}:${value}`, async () => {
            return await this.where(column, value).first();
        });
    }

    /**
     * Find by multiple conditions
     * Usage: User.findWhere({ status: 'active', role: 'admin' })
     */
    async findWhere(conditions = {}) {
        const cacheKey = `findWhere:${JSON.stringify(conditions)}`;
        return await this._withCache(cacheKey, async () => {
            let query = this;
            Object.keys(conditions).forEach(key => {
                query = query.where(key, conditions[key]);
            });
            return await query.first();
        });
    }

    async get() {
        try {
            const { data, error } = await this._getQuery();
            this._resetBuilder();
            if (error) throw error;
            return data;
        } catch (error) {
            this._resetBuilder();
            throw error;
        }
    }

    async first() {
        try {
            const { data, error } = await this._getQuery().single();
            this._resetBuilder();
            
            // Handle 'PGRST116' (no rows) gracefully
            if (error && error.code === 'PGRST116') return null;
            if (error) throw error;
            
            return data;
        } catch (error) {
            this._resetBuilder();
            throw error;
        }
    }

    async find(id) {
        return await this._withCache(`id:${id}`, async () => {
            return await this.where('id', id).first();
        });
    }

    async all() {
        return await this.get();
    }

    // --- PERSISTENCE METHODS ---

    async create(payload) {
        this._resetBuilder();
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
        this._resetBuilder();
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
        this._resetBuilder();
        const { error } = await supabase
            .from(this.table)
            .delete()
            .eq('id', id);
        
        if (error) throw error;

        this._clearTableCache();
        return true;
    }

    _resetBuilder() {
        this.queryInstance = null;
        this.selectedColumns = '*';
    }
}

module.exports = BaseModel;