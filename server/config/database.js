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

    // Create tables in correct order
    await createTables();
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

async function createTables() {
  // Create tables in the correct order to avoid foreign key constraint errors
  
  // 1. First create users table (no dependencies)
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
  console.log('✓ Users table created');

  // 2. Create restaurants table (depends on users)
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Restaurants table created');

  // 3. Create restaurant_categories table (depends on restaurants)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS restaurant_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NOT NULL,
      category VARCHAR(100) NOT NULL,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Restaurant categories table created');

  // 4. Create menu_items table (depends on restaurants)
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Menu items table created');

  // 5. Create orders table (depends on users and restaurants)
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('✓ Orders table created');

  // 6. Create order_items table (depends on orders and menu_items)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      menu_item_id INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Order items table created');

  // 7. Create payments table (depends on orders)
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Payments table created');

  // 8. Create delivery_locations table (depends on orders and users)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS delivery_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      agent_id INT NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Delivery locations table created');

  // 9. Create user_sessions table (depends on users)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(500) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ User sessions table created');

  // Insert default admin user if not exists
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
  }

  console.log('🎉 All database tables created successfully!');
}