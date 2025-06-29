import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smartbite_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

export const pool = mysql.createPool(dbConfig);

export async function initializeDatabase() {
  try {
    console.log(`Attempting to connect to MySQL at ${dbConfig.host}:${dbConfig.port}`);
    
    // Test the connection first
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database');
    connection.release();

    // Create database if it doesn't exist
    const adminConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await adminConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`Database ${dbConfig.database} created or already exists`);
    await adminConnection.end();

    // Check existing tables and adapt to your schema
    await adaptToExistingSchema();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    console.error('Connection config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    });
    throw error;
  }
}

async function adaptToExistingSchema() {
  try {
    // Check what tables already exist
    const [existingTables] = await pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
      [dbConfig.database]
    );
    
    const tableNames = existingTables.map(row => row.TABLE_NAME);
    console.log('Existing tables:', tableNames);

    // Check if we have the old schema structure
    const hasOldSchema = tableNames.includes('users') && tableNames.includes('accounts');
    
    if (hasOldSchema) {
      console.log('🔄 Adapting to existing schema structure...');
      await adaptExistingTables();
    } else {
      console.log('🆕 Creating new schema structure...');
      await createNewSchema();
    }

    // Create additional tables needed for the app
    await createAdditionalTables();

    // Insert default data
    await insertDefaultData();

    console.log('🎉 Database schema adapted successfully!');
  } catch (error) {
    console.error('Error adapting schema:', error);
    throw error;
  }
}

async function adaptExistingTables() {
  try {
    // Check if users table has the columns we need
    const [userColumns] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [dbConfig.database]);
    
    const columnNames = userColumns.map(row => row.COLUMN_NAME);
    console.log('Users table columns:', columnNames);

    // Add missing columns to users table
    if (!columnNames.includes('password')) {
      await pool.execute('ALTER TABLE users ADD COLUMN password VARCHAR(255)');
      console.log('✓ Added password column to users table');
    }
    
    if (!columnNames.includes('role')) {
      await pool.execute(`ALTER TABLE users ADD COLUMN role ENUM('customer', 'owner', 'agent', 'admin') DEFAULT 'customer'`);
      console.log('✓ Added role column to users table');
    }
    
    if (!columnNames.includes('town')) {
      await pool.execute('ALTER TABLE users ADD COLUMN town VARCHAR(100)');
      console.log('✓ Added town column to users table');
    }
    
    if (!columnNames.includes('is_active')) {
      await pool.execute('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true');
      console.log('✓ Added is_active column to users table');
    }
    
    if (!columnNames.includes('created_at')) {
      await pool.execute('ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('✓ Added created_at column to users table');
    }
    
    if (!columnNames.includes('updated_at')) {
      await pool.execute('ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      console.log('✓ Added updated_at column to users table');
    }

    // Migrate data from accounts table to users table if needed
    const [accountsExist] = await pool.execute(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'accounts'
    `, [dbConfig.database]);

    if (accountsExist[0].count > 0) {
      // Update users with password from accounts table
      await pool.execute(`
        UPDATE users u 
        JOIN accounts a ON u.user_id = a.user_id 
        SET u.password = a.password 
        WHERE u.password IS NULL OR u.password = ''
      `);
      console.log('✓ Migrated passwords from accounts table');

      // Set roles based on subtype tables
      await pool.execute(`UPDATE users SET role = 'admin' WHERE user_id IN (SELECT user_id FROM admins)`);
      await pool.execute(`UPDATE users SET role = 'customer' WHERE user_id IN (SELECT user_id FROM customers)`);
      await pool.execute(`UPDATE users SET role = 'agent' WHERE user_id IN (SELECT user_id FROM delivery_agents)`);
      await pool.execute(`UPDATE users SET role = 'owner' WHERE user_id IN (SELECT user_id FROM restaurants)`);
      console.log('✓ Set user roles based on existing data');
    }

  } catch (error) {
    console.error('Error adapting existing tables:', error);
    // Continue anyway - we'll create what we need
  }
}

async function createNewSchema() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20),
      role ENUM('customer', 'owner', 'agent', 'admin') NOT NULL DEFAULT 'customer',
      town VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Users table created');
}

async function createAdditionalTables() {
  // Create restaurants table if it doesn't exist or modify existing one
  const [restaurantColumns] = await pool.execute(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'restaurants'
  `, [dbConfig.database]).catch(() => [[]]);
  
  if (restaurantColumns.length === 0) {
    // Create new restaurants table
    await pool.execute(`
      CREATE TABLE restaurants (
        restaurant_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image VARCHAR(500),
        town VARCHAR(100) NOT NULL,
        address VARCHAR(500) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        delivery_time VARCHAR(50) NOT NULL,
        delivery_fee DECIMAL(10,2) NOT NULL,
        min_order DECIMAL(10,2) NOT NULL,
        rating DECIMAL(3,2) DEFAULT 0.0,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Restaurants table created');
  } else {
    // Add missing columns to existing restaurants table
    const columnNames = restaurantColumns.map(row => row.COLUMN_NAME);
    
    const columnsToAdd = [
      { name: 'name', definition: 'VARCHAR(255) NOT NULL' },
      { name: 'description', definition: 'TEXT' },
      { name: 'image', definition: 'VARCHAR(500)' },
      { name: 'town', definition: 'VARCHAR(100) NOT NULL' },
      { name: 'address', definition: 'VARCHAR(500) NOT NULL' },
      { name: 'phone', definition: 'VARCHAR(20) NOT NULL' },
      { name: 'delivery_time', definition: 'VARCHAR(50) NOT NULL' },
      { name: 'delivery_fee', definition: 'DECIMAL(10,2) NOT NULL' },
      { name: 'min_order', definition: 'DECIMAL(10,2) NOT NULL' },
      { name: 'rating', definition: 'DECIMAL(3,2) DEFAULT 0.0' },
      { name: 'is_active', definition: 'BOOLEAN DEFAULT false' },
      { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ];

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        try {
          await pool.execute(`ALTER TABLE restaurants ADD COLUMN ${column.name} ${column.definition}`);
          console.log(`✓ Added ${column.name} column to restaurants table`);
        } catch (err) {
          console.log(`- Column ${column.name} might already exist or couldn't be added`);
        }
      }
    }
  }

  // Create restaurant_categories table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS restaurant_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NOT NULL,
      category VARCHAR(100) NOT NULL,
      INDEX idx_restaurant_id (restaurant_id)
    )
  `);
  console.log('✓ Restaurant categories table ready');

  // Create menu_items table (enhanced version of menu)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS menu_items (
      menu_id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      item_description TEXT,
      item_price DECIMAL(10,2) NOT NULL,
      image VARCHAR(500),
      category VARCHAR(100) NOT NULL,
      prep_time INT NOT NULL DEFAULT 15,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_restaurant_id (restaurant_id)
    )
  `);
  console.log('✓ Menu items table ready');

  // Enhance existing orders table
  const [orderColumns] = await pool.execute(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders'
  `, [dbConfig.database]).catch(() => [[]]);
  
  if (orderColumns.length > 0) {
    const columnNames = orderColumns.map(row => row.COLUMN_NAME);
    
    const columnsToAdd = [
      { name: 'restaurant_id', definition: 'INT' },
      { name: 'delivery_address', definition: 'TEXT' },
      { name: 'customer_phone', definition: 'VARCHAR(20)' },
      { name: 'payment_method', definition: 'VARCHAR(50) DEFAULT "cash"' },
      { name: 'payment_status', definition: 'ENUM("pending", "paid", "failed") DEFAULT "pending"' }
    ];

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        try {
          await pool.execute(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.definition}`);
          console.log(`✓ Added ${column.name} column to orders table`);
        } catch (err) {
          console.log(`- Column ${column.name} might already exist`);
        }
      }
    }
  }

  // Create delivery_locations table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS delivery_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      agent_id INT NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_order_id (order_id),
      INDEX idx_agent_id (agent_id)
    )
  `);
  console.log('✓ Delivery locations table ready');

  // Create user_sessions table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(500) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id)
    )
  `);
  console.log('✓ User sessions table ready');
}

async function insertDefaultData() {
  try {
    // Insert default roles if roles table exists
    const [rolesExist] = await pool.execute(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'roles'
    `, [dbConfig.database]);

    if (rolesExist[0].count > 0) {
      const roles = ['customer', 'owner', 'agent', 'admin'];
      for (const role of roles) {
        await pool.execute(`
          INSERT IGNORE INTO roles (role_name) VALUES (?)
        `, [role]);
      }
      console.log('✓ Default roles inserted');
    }

    // Create default admin user
    const [adminExists] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ? AND role = ?',
      ['admin@smartbite.cm', 'admin']
    );

    if (adminExists.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.execute(
        'INSERT INTO users (name, email, password, role, town, phone_number) VALUES (?, ?, ?, ?, ?, ?)',
        ['SmartBite Admin', 'admin@smartbite.cm', hashedPassword, 'admin', 'Douala', '+237600000000']
      );
      console.log('✓ Default admin user created');
    } else {
      console.log('✓ Default admin user already exists');
    }
  } catch (error) {
    console.log('Note: Could not insert default data:', error.message);
  }
}