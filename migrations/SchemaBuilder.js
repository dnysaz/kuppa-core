/**
 * kuppa Column Definition - Handles Chaining Logic
 * Refined by Ketut Dana
 */
class ColumnDefinition {
    constructor(name, type, parentSchema) {
        this.name = name;
        this.type = type;
        this.parentSchema = parentSchema;
        this._nullable = false; 
        this._default = null;
        this._unique = false;
        this._onDelete = 'CASCADE'; // Default
    }

    nullable(isNullable = true) {
        this._nullable = isNullable;
        return this;
    }

    default(value) {
        if (typeof value === 'string' && !value.includes('()')) {
            this._default = `'${value}'`;
        } else {
            this._default = value;
        }
        return this;
    }

    unique() {
        this._unique = true;
        return this;
    }

    /**
     * Flexibility for deletion policy
     */
    onDelete(action) {
        this._onDelete = action;
        return this;
    }

    references(table, column = 'id') {
        // We defer the string building to capture onDelete preference
        this.parentSchema.constraints.push({
            toString: () => `FOREIGN KEY (${this.name}) REFERENCES ${table}(${column}) ON DELETE ${this._onDelete}`
        });
        return this;
    }

    toString() {
        let sql = `${this.name} ${this.type}`;
        if (this._unique) sql += ' UNIQUE';
        if (this._default !== null) sql += ` DEFAULT ${this._default}`;
        if (!this._nullable) sql += ' NOT NULL';
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

    _addColumn(name, type) {
        const column = new ColumnDefinition(name, type, this);
        this.columns.push(column);
        return column;
    }

    id() {
        this.columns.push({
            toString: () => 'id UUID PRIMARY KEY DEFAULT gen_random_uuid()'
        });
        return this;
    }

    uuid(name) { return this._addColumn(name, 'UUID'); }
    string(name) { return this._addColumn(name, 'TEXT'); }
    text(name) { return this._addColumn(name, 'TEXT'); }
    integer(name) { return this._addColumn(name, 'BIGINT'); }
    boolean(name) { return this._addColumn(name, 'BOOLEAN'); }
    
    decimal(name, precision = 15, scale = 2) { 
        return this._addColumn(name, `NUMERIC(${precision}, ${scale})`); 
    }

    /**
     * Enum with Check Constraint
     */
    enum(name, allowedValues) {
        const values = allowedValues.map(v => `'${v}'`).join(', ');
        const col = this._addColumn(name, 'TEXT');
        this.constraints.push(`CONSTRAINT ${name}_check CHECK (${name} IN (${values}))`);
        return col;
    }

    /**
     * Timestamps with Timezone support
     */
    timestamps() {
        this.columns.push({ toString: () => 'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL' });
        this.columns.push({ toString: () => 'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL' });
        return this;
    }

    /**
     * Build final SQL
     */
    build(tableName) {
        const columnStrings = this.columns.map(col => col.toString());
        const constraintStrings = this.constraints.map(c => c.toString());
        const allDefinitions = [...columnStrings, ...constraintStrings];
        
        return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${allDefinitions.join(',\n  ')}\n);`;
    }
}

module.exports = SchemaBuilder;