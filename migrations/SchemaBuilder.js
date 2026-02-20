/**
 * kuppa Column Definition - Handles Chaining Logic
 */
class ColumnDefinition {
    constructor(name, type, parentSchema) {
        this.name = name;
        this.type = type;
        this.parentSchema = parentSchema;
        this._nullable = false; // Default: NOT NULL (Strict Mode)
        this._default = null;
        this._unique = false;
    }

    /**
     * Set column as nullable
     */
    nullable(isNullable = true) {
        this._nullable = isNullable;
        return this;
    }

    /**
     * Set default value
     */
    default(value) {
        if (typeof value === 'string') {
            this._default = `'${value}'`;
        } else {
            this._default = value;
        }
        return this;
    }

    /**
     * Set unique constraint
     */
    unique() {
        this._unique = true;
        return this;
    }

    /**
     * Define Foreign Key Relationship
     */
    references(table, column = 'id') {
        this.parentSchema.constraints.push(
            `FOREIGN KEY (${this.name}) REFERENCES ${table}(${column}) ON DELETE CASCADE`
        );
        return this;
    }

    /**
     * Generate SQL String for the column
     */
    toString() {
        let sql = `${this.name} ${this.type}`;
        if (this._unique) sql += ' UNIQUE';
        if (this._default !== null) sql += ` DEFAULT ${this._default}`;
        if (!this._nullable) sql += ' NOT NULL';
        // If nullable is true, Postgres default is NULL, so no extra string needed
        return sql;
    }
}

/**
 * kuppa Schema Builder - High Performance DDL Generator
 */
class SchemaBuilder {
    constructor() {
        this.columns = [];
        this.constraints = [];
    }

    /**
     * Internal helper to add columns
     */
    _addColumn(name, type) {
        const column = new ColumnDefinition(name, type, this);
        this.columns.push(column);
        return column;
    }

    /**
     * Primary Key (UUID)
     */
    id() {
        this.columns.push({
            toString: () => 'id UUID PRIMARY KEY DEFAULT gen_random_uuid()'
        });
        return this;
    }

    /**
     * UUID Type (For Foreign Keys)
     */
    uuid(name) {
        return this._addColumn(name, 'UUID');
    }

    /**
     * String/Text types
     */
    string(name) { return this._addColumn(name, 'TEXT'); }
    text(name) { return this._addColumn(name, 'TEXT'); }
    
    /**
     * Numeric types
     */
    integer(name) { return this._addColumn(name, 'BIGINT'); }
    boolean(name) { return this._addColumn(name, 'BOOLEAN'); }
    decimal(name, precision = 10, scale = 2) { 
        return this._addColumn(name, `NUMERIC(${precision}, ${scale})`); 
    }

    /**
     * Enum implementation using CHECK constraint
     */
    enum(name, allowedValues) {
        const values = allowedValues.map(v => `'${v}'`).join(', ');
        const col = this._addColumn(name, 'TEXT');
        this.constraints.push(`CONSTRAINT ${name}_check CHECK (${name} IN (${values}))`);
        return col;
    }

    /**
     * Standard Timestamps
     */
    timestamps() {
        this.columns.push({ toString: () => 'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL' });
        this.columns.push({ toString: () => 'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL' });
        return this;
    }

    /**
     * Build final CREATE TABLE SQL
     */
    build(tableName) {
        const columnDefinitions = this.columns.map(col => col.toString());
        const allDefinitions = [...columnDefinitions, ...this.constraints];
        
        return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${allDefinitions.join(',\n  ')}\n);`;
    }
}

module.exports = SchemaBuilder;