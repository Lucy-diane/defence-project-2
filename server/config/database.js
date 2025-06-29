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

    // Check existing tables and create/update as needed
    await setupTables();
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

async function setupTables() {
  try {
    // Check what tables already exist
    const [existingTables] = await pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
      [dbConfig.database]
    );
    
    const tableNames = existingTables.map(row => row.TABLE_NAME);
    console.log('Existing tables:', tableNames);

    // Drop foreign key constraints first to avoid conflicts
    if (tableNames.length > 0) {
      console.log('Cleaning up existing foreign key constraints...');
      await cleanupForeignKeys();
    }

    // Create/recreate tables in correct order
    await createUsersTable();
    await createRestaurantsTable();
    await createRestaurantCategoriesTable();
    await createMenuItemsTable();
    await createOrdersTable();
    await createOrderItemsTable();
    await createPaymentsTable();
    await createDeliveryLocationsTable();
    await createUserSessionsTable();

    // Insert default admin user if not exists
    await createDefaultAdmin();

    console.log('🎉 All database tables set up successfully!');
  } catch (error) {
    console.error('Error setting up tables:', error);
    throw error;
  }
}

async function cleanupForeignKeys() {
  try {
    // Get all foreign key constraints
    const [constraints] = await pool.execute(`
      SELECT CONSTRAINT_NAME, TABLE_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_SCHEMA = ? 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database]);

    // Drop each foreign key constraint
    for (const constraint of constraints) {
      try {
        await pool.execute(`ALTER TABLE ${constraint.TABLE_NAME} DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`);
        console.log(`✓ Dropped foreign key: ${constraint.CONSTRAINT_NAME}`);
      } catch (err) {
        // Ignore errors if constraint doesn't exist
        console.log(`- Foreign key ${constraint.CONSTRAINT_NAME} already removed or doesn't exist`);
      }
    }
  } catch (error) {
    console.log('Note: Could not clean up foreign keys (this is normal for new databases)');
  }
}

async function createUsersTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      role ENUM('customer', 'owner', 'agent', 'admin') NOT NULL DEFAULT 'customer',
      town VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Users table ready');
}

async function createRestaurantsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  
  // Add foreign key constraint
  try {
    await pool.execute(`
      ALTER TABLE restaurants 
      ADD CONSTRAINT fk_restaurants_owner 
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  } catch (err) {
    // Constraint might already exist
    console.log('- Restaurants foreign key constraint already exists');
  }
  
  console.log('✓ Restaurants table ready');
}

async function createRestaurantCategoriesTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS restaurant_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NOT NULL,
      category VARCHAR(100) NOT NULL
    )
  `);
  
  // Add foreign key constraint
  try {
    await pool.execute(`
      ALTER TABLE restaurant_categories 
      ADD CONSTRAINT fk_restaurant_categories_restaurant 
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Restaurant categories foreign key constraint already exists');
  }
  
  console.log('✓ Restaurant categories table ready');
}

async function createMenuItemsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      image VARCHAR(500),
      category VARCHAR(100) NOT NULL,
      prep_time INT NOT NULL,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  
  // Add foreign key constraint
  try {
    await pool.execute(`
      ALTER TABLE menu_items 
      ADD CONSTRAINT fk_menu_items_restaurant 
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Menu items foreign key constraint already exists');
  }
  
  console.log('✓ Menu items table ready');
}

async function createOrdersTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      restaurant_id INT NOT NULL,
      agent_id INT NULL,
      total DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'preparing', 'ready', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
      delivery_address TEXT NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'cash',
      payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
      payment_reference VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  
  // Add foreign key constraints
  try {
    await pool.execute(`
      ALTER TABLE orders 
      ADD CONSTRAINT fk_orders_customer 
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Orders customer foreign key constraint already exists');
  }
  
  try {
    await pool.execute(`
      ALTER TABLE orders 
      ADD CONSTRAINT fk_orders_restaurant 
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Orders restaurant foreign key constraint already exists');
  }
  
  try {
    await pool.execute(`
      ALTER TABLE orders 
      ADD CONSTRAINT fk_orders_agent 
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
    `);
  } catch (err) {
    console.log('- Orders agent foreign key constraint already exists');
  }
  
  console.log('✓ Orders table ready');
}

async function createOrderItemsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      menu_item_id INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL
    )
  `);
  
  // Add foreign key constraints
  try {
    await pool.execute(`
      ALTER TABLE order_items 
      ADD CONSTRAINT fk_order_items_order 
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Order items order foreign key constraint already exists');
  }
  
  try {
    await pool.execute(`
      ALTER TABLE order_items 
      ADD CONSTRAINT fk_order_items_menu_item 
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Order items menu item foreign key constraint already exists');
  }
  
  console.log('✓ Order items table ready');
}

async function createPaymentsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'XAF',
      phone_number VARCHAR(20) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      reference VARCHAR(255) UNIQUE NOT NULL,
      external_reference VARCHAR(255),
      status ENUM('pending', 'successful', 'failed', 'cancelled') DEFAULT 'pending',
      operator VARCHAR(50),
      operator_reference VARCHAR(255),
      description TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  
  // Add foreign key constraint
  try {
    await pool.execute(`
      ALTER TABLE payments 
      ADD CONSTRAINT fk_payments_order 
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Payments foreign key constraint already exists');
  }
  
  console.log('✓ Payments table ready');
}

async function createDeliveryLocationsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS delivery_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      agent_id INT NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add foreign key constraints
  try {
    await pool.execute(`
      ALTER TABLE delivery_locations 
      ADD CONSTRAINT fk_delivery_locations_order 
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Delivery locations order foreign key constraint already exists');
  }
  
  try {
    await pool.execute(`
      ALTER TABLE delivery_locations 
      ADD CONSTRAINT fk_delivery_locations_agent 
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- Delivery locations agent foreign key constraint already exists');
  }
  
  console.log('✓ Delivery locations table ready');
}

async function createUserSessionsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(500) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add foreign key constraint
  try {
    await pool.execute(`
      ALTER TABLE user_sessions 
      ADD CONSTRAINT fk_user_sessions_user 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  } catch (err) {
    console.log('- User sessions foreign key constraint already exists');
  }
  
  console.log('✓ User sessions table ready');
}

async function createDefaultAdmin() {
  try {
    const [adminExists] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND role = ?',
      ['admin@smartbite.cm', 'admin']
    );

    if (adminExists.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.execute(
        'INSERT INTO users (name, email, password, role, town) VALUES (?, ?, ?, ?, ?)',
        ['SmartBite Admin', 'admin@smartbite.cm', hashedPassword, 'admin', 'Douala']
      );
      console.log('✓ Default admin user created');
    } else {
      console.log('✓ Default admin user already exists');
    }
  } catch (error) {
    console.log('Note: Could not create default admin user:', error.message);
  }
}