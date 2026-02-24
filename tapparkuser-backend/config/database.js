const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.connection = null;
    this.enablePoolLogging = process.env.DB_POOL_VERBOSE === 'true';
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: '',
      database: process.env.DB_NAME || 'merge2', // Use environment variable for database name
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 100,
      charset: 'utf8mb4'
    };
  }

  async connect() {
    try {
      this.connection = await mysql.createPool(this.config);
      console.log('Connected to MySQL database pool');
      if (this.enablePoolLogging) {
        this.connection.on('acquire', () => console.log('📦 MySQL connection acquired'));
        this.connection.on('release', () => console.log('📤 MySQL connection released'));
      }
      
      // Test the connection
      const [rows] = await this.connection.execute('SELECT 1');
      console.log('Database connection test successful');
      
      return this.connection;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('Database connection closed');
    }
  }

  async query(sql, params = []) {
    try {
      if (!this.connection) {
        await this.connect();
      }
      
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Execute query and return result with affected rows info
  async execute(sql, params = []) {
    try {
      if (!this.connection) {
        await this.connect();
      }
      
      const [rows, fields] = await this.connection.execute(sql, params);
      return {
        rows,
        affectedRows: rows.affectedRows || 0,
        insertId: rows.insertId || null
      };
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  }

  async transaction(queries) {
    let connection = null;
    try {
      if (!this.connection) {
        await this.connect();
      }

      // Get a connection from the pool for transaction
      connection = await this.connection.getConnection();
      await connection.beginTransaction();
      
      const results = [];
      for (const { sql, params } of queries) {
        const [rows] = await connection.execute(sql, params);
        results.push({
          rows,
          affectedRows: rows.affectedRows || 0,
          insertId: rows.insertId || null
        });
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Transaction error:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Helper method to check if a table exists
  async tableExists(tableName) {
    try {
      const result = await this.query(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
        [this.config.database, tableName]
      );
      return result[0].count > 0;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  // Helper method to get table structure
  async getTableStructure(tableName) {
    try {
      return await this.query(`DESCRIBE ${tableName}`);
    } catch (error) {
      console.error('Error getting table structure:', error);
      throw error;
    }
  }
}

module.exports = new Database();
