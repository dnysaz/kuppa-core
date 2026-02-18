const SchemaBuilder = require('./SchemaBuilder');

/**
 * kuppa.js Base Migration Engine
 * Serious & Fast Schema Definition
 */
class Migration {
    /**
     * Create a new table on the schema.
     */
    createTable(tableName, callback) {
        const table = new SchemaBuilder();
        callback(table);
        return table.build(tableName);
    }

    /**
     * Drop a table from the schema.
     */
    dropTable(tableName) {
        return `DROP TABLE IF EXISTS ${tableName} CASCADE;`;
    }

    /**
     * Rename an existing table.
     */
    renameTable(from, to) {
        return `ALTER TABLE ${from} RENAME TO ${to};`;
    }

    /**
     * Add or Modify columns (Manual SQL Fallback)
     */
    raw(sql) {
        return sql;
    }
}

module.exports = Migration;