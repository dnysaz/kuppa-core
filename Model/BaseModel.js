'use strict'

/**
 * KUPPA ORM - FINAL PRO
 * ✔ Redis Adapter Ready
 * ✔ Memory Fallback
 * ✔ Horizontal Safe
 * ✔ SHA256 Collision Safe
 * ✔ Offset Fixed
 * ✔ Transaction Injection Ready
 * ✔ Stateless & Immutable
 */

const crypto       = require('crypto')
const { supabase } = coreFile('Config/Database')
const Logger       = coreFile('Utils.Logger');

/* ============================================================
   CACHE ADAPTER SYSTEM
============================================================ */

class MemoryCache {
    constructor() {
        this.store = new Map()
    }

    async get(key) {
        const data = this.store.get(key)
        if (!data) return null

        if (Date.now() > data.expire) {
            this.store.delete(key)
            return null
        }

        return data.value
    }

    async set(key, value, ttl) {
        this.store.set(key, {
            value,
            expire: Date.now() + ttl
        })
    }

    async delByPrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key)
            }
        }
    }
}

class RedisCache {
    constructor(redis) {
        this.redis = redis
    }

    async get(key) {
        const data = await this.redis.get(key)
        return data ? JSON.parse(data) : null
    }

    async set(key, value, ttl) {
        await this.redis.set(key, JSON.stringify(value), 'PX', ttl)
    }

    async delByPrefix(prefix) {
        const keys = await this.redis.keys(`${prefix}*`)
        if (keys.length) {
            await this.redis.del(keys)
        }
    }
}

/* ============================================================
   BASE MODEL
============================================================ */

class BaseModel {

    static table = null
    static primaryKey = 'id'
    static fillable = []
    static relations = {}
    static cacheTTL = 5000

    static cache = new MemoryCache() // default fallback

    static useRedis(redisClient) {
        this.cache = new RedisCache(redisClient)
    }

    static query(client = null) {
        if (!this.table) {
            throw new Error(`${this.name} must define static table`)
        }

        return new QueryBuilder({
            model: this,
            client: client || supabase
        })
    }

    static where(...args) { return this.query().where(...args) }
    static find(id) { return this.query().find(id) }
    static create(payload) { return this.query().create(payload) }
}

/* ============================================================
   QUERY BUILDER (IMMUTABLE)
============================================================ */

class QueryBuilder {

    constructor({ model, client, state = {} }) {
        this.model = model
        this.client = client
        this.state = {
            filters: [],
            select: '*',
            order: null,
            limit: null,
            offset: null,
            ...state
        }
    }

    _clone(patch = {}) {
        return new QueryBuilder({
            model: this.model,
            client: this.client,
            state: { ...this.state, ...patch }
        })
    }

    /* ================== RELATIONS ================== */

    with(...relations) {
        const relationSelect = relations.map(r => {
            if (!this.model.relations[r]) {
                throw new Error(`Relation '${r}' not registered`)
            }
            return `${r}(*)`
        })

        return this._clone({
            select: `*, ${relationSelect.join(', ')}`
        })
    }

    /* ================== FILTERS ================== */

    where(column, operator, value = null) {
        if (value === null) {
            value = operator
            operator = '='
        }

        const opMap = {
            '=': 'eq',
            '>': 'gt',
            '>=': 'gte',
            '<': 'lt',
            '<=': 'lte',
            '!=': 'neq',
            'like': 'ilike',
            'in': 'in'
        }

        const method = opMap[operator] || 'eq'

        return this._clone({
            filters: [...this.state.filters, { column, method, value }]
        })
    }

    orderBy(column, ascending = true) {
        return this._clone({ order: { column, ascending } })
    }

    limit(count) {
        return this._clone({ limit: count })
    }

    offset(value) {
        return this._clone({ offset: value })
    }

    /* ================== CACHE KEY ================== */

    _getTableHash() {
        return crypto.createHash('md5').update(this.model.table).digest('hex').substring(0, 8);
    }

    _getCacheKey() {
        const prefix = this._getTableHash();
        
        const essentialState = {
            f: this.state.filters.map(f => `${f.column}${f.method}${f.value}`),
            s: this.state.select,
            o: this.state.order,
            l: this.state.limit,
            off: this.state.offset
        };
    
        const signature = crypto
            .createHash('sha256')
            .update(JSON.stringify(essentialState))
            .digest('hex')
            .substring(0, 16);
    
        return `${prefix}:${signature}`;
    }

    async _execute(baseQuery, useCache = true) {

        const key = this._getCacheKey()

        if (useCache) {
            const cached = await this.model.cache.get(key);
            if (cached) {
                if (process.env.APP_DEBUG === 'true') {
                    Logger.info(`[KUPPA CACHE] HIT: ${key}`);
                }
                return cached;
            }
            if (process.env.APP_DEBUG === 'true') {
                Logger.info(`[KUPPA CACHE] MISS: ${key}`);
            }
        }

        let query = baseQuery.select(this.state.select)

        this.state.filters.forEach(f => {
            query = query[f.method](f.column, f.value)
        })

        if (this.state.order) {
            query = query.order(
                this.state.order.column,
                { ascending: this.state.order.ascending }
            )
        }

        if (this.state.limit !== null) {
            query = query.limit(this.state.limit)
        }

        if (this.state.offset !== null) {
            query = query.range(
                this.state.offset,
                this.state.offset + (this.state.limit || 10) - 1
            )
        }

        const { data, error } = await query;

        if (error) throw error;

        if (useCache) {
            await this.model.cache.set(key, data, this.model.cacheTTL);
        }

        return data;
    }

    /* ================== TERMINAL ================== */

    async get() {
        return this._execute(
            this.client.from(this.model.table)
        )
    }

    async first() {
        const data = await this.limit(1).get()
        return data[0] || null
    }

    async find(id) {
        return this.where(
            this.model.primaryKey,
            id
        ).first()
    }

    async paginate({ page = 1, perPage = 10 } = {}) {
        // Ensure numeric types to prevent offset calculation errors
        const currentPage = Math.max(1, Number(page));
        const limitPerPage = Math.max(1, Number(perPage));
        const offset = (currentPage - 1) * limitPerPage;

        // 1. CACHE STRATEGY (Sync with _getCacheKey & _invalidateCache)
        const cacheKey = `${this._getCacheKey()}:pg:${currentPage}:${limitPerPage}`;
        const cached = await this.model.cache.get(cacheKey);
        
        if (cached) {
            if (process.env.APP_DEBUG === 'true') {
                Logger.info(`[KUPPA CACHE] HIT PAGINATE: ${cacheKey}`);
            }
            return cached;
        }

        // 2. QUERY EXECUTION
        let query = this.client
            .from(this.model.table)
            .select(this.state.select, { count: 'exact' });

        // Apply dynamic filters
        this.state.filters.forEach(f => {
            query = query[f.method](f.column, f.value);
        });

        // Apply ordering
        if (this.state.order) {
            query = query.order(
                this.state.order.column,
                { ascending: this.state.order.ascending }
            );
        }

        // Fetch data with precise range
        const { data, count, error } = await query.range(
            offset, 
            offset + limitPerPage - 1
        );

        if (error) {
            console.error(`[KUPPA ORM ERROR]: Pagination failed for ${this.model.table}`, error.message);
            throw error;
        }

        // 3. STRUCTURE RESPONSE
        const result = {
            data: data || [],
            meta: {
                total: count || 0,
                perPage: limitPerPage,
                currentPage: currentPage,
                lastPage: Math.ceil((count || 0) / limitPerPage)
            }
        };

        // 4. SAVE TO CACHE
        await this.model.cache.set(cacheKey, result, this.model.cacheTTL);

        return result;
    }

    /* ================== WRITES ================== */

    async create(payload) {

        const clean = this._filterFillable(payload)

        const { data, error } =
            await this.client
                .from(this.model.table)
                .insert(clean)
                .select()
                .single()

        if (error) throw error

        await this._invalidateCache()

        return data
    }

    async update(payload) {

        if (!this.state.filters.length) {
            throw new Error('Update requires where clause')
        }

        const clean = this._filterFillable(payload)

        let query =
            this.client
                .from(this.model.table)
                .update(clean)

        this.state.filters.forEach(f => {
            query = query[f.method](f.column, f.value)
        })

        const { data, error } =
            await query.select()

        if (error) throw error

        await this._invalidateCache()

        return data
    }

    async delete() {

        if (!this.state.filters.length) {
            throw new Error('Delete requires where clause')
        }

        let query =
            this.client
                .from(this.model.table)
                .delete()

        this.state.filters.forEach(f => {
            query = query[f.method](f.column, f.value)
        })

        const { error } = await query

        if (error) throw error

        await this._invalidateCache()

        return true
    }

    /* ================== HELPERS ================== */

    _filterFillable(payload) {
        if (!this.model.fillable.length) return payload

        return Object.keys(payload)
            .filter(k => this.model.fillable.includes(k))
            .reduce((acc, key) => {
                acc[key] = payload[key]
                return acc
            }, {})
    }

    async _invalidateCache() {
        const prefix = this._getTableHash();
        await this.model.cache.delByPrefix(prefix);
    }

}

module.exports = BaseModel