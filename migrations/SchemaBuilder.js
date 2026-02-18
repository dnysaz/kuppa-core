/**
 * fxd4 Column Definition - Handles Chaining Logic
 */
class ColumnDefinition {
    constructor(name, type) {
        this.name = name;
        this.type = type;
        this._nullable = false; // Default NOT NULL di Postgres
        this._default = null;
        this._unique = false;
    }

    nullable() {
        this._nullable = true;
        return this;
    }

    default(value) {
        if (typeof value === 'string') {
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
     * Convert column object to SQL string
     */
    toString() {
        let sql = `${this.name} ${this.type}`;
        
        if (this._unique) sql += ' UNIQUE';
        if (this._default !== null) sql += ` DEFAULT ${this._default}`;
        if (!this._nullable) sql += ' NOT NULL';
        
        return sql;
    }
}

/**
 * fxd4 Schema Builder - High Performance DDL Generator
 */
class SchemaBuilder {
    constructor() {
        this.columns = [];
        this.constraints = [];
    }

    // Helper to push and return column for chaining
    _addColumn(name, type) {
        const column = new ColumnDefinition(name, type);
        this.columns.push(column);
        return column;
    }

    // Primary Key (UUID Supabase Style)
    id() {
        this.columns.push({
            toString: () => 'id UUID PRIMARY KEY DEFAULT auth.uid()'
        });
        return this;
    }

    // Tipe Data Dasar
    string(name) { return this._addColumn(name, 'TEXT'); }
    text(name) { return this._addColumn(name, 'TEXT'); }
    integer(name) { return this._addColumn(name, 'BIGINT'); }
    boolean(name) { return this._addColumn(name, 'BOOLEAN'); }
    
    decimal(name, precision = 10, scale = 2) { 
        return this._addColumn(name, `NUMERIC(${precision}, ${scale})`); 
    }

    /**
     * Enum Type
     * @param {string} name 
     * @param {string[]} allowedValues 
     */
    enum(name, allowedValues) {
        const values = allowedValues.map(v => `'${v}'`).join(', ');
        const col = this._addColumn(name, 'TEXT');
        // Tambahkan CHECK constraint untuk mensimulasikan Enum
        this.constraints.push(`CONSTRAINT ${name}_check CHECK (${name} IN (${values}))`);
        return col;
    }

    // Relationship (Foreign Key)
    foreignId(name) {
        this._addColumn(name, 'UUID');
        return {
            constrained: (referencesTable) => {
                this.constraints.push(`FOREIGN KEY (${name}) REFERENCES ${referencesTable}(id) ON DELETE CASCADE`);
                return this;
            }
        };
    }

    // Timestamps
    timestamps() {
        this.columns.push({ toString: () => 'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()' });
        this.columns.push({ toString: () => 'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()' });
        return this;
    }

    /**
     * Build the final SQL Query
     */
    build(tableName) {
        const columnDefinitions = this.columns.map(col => col.toString());
        const allDefinitions = [...columnDefinitions, ...this.constraints];
        
        return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${allDefinitions.join(',\n  ')}\n);`;
    }
}

module.exports = SchemaBuilder;