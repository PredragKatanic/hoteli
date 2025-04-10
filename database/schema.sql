CREATE DATABASE IF NOT EXISTS hotel;
USE hotel;

CREATE TABLE IF NOT EXISTS room_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    num_beds INT NOT NULL,
    size VARCHAR(20) NOT NULL,
    cot_available BOOLEAN DEFAULT FALSE,
    view_type ENUM('beach', 'forest', 'city', 'garden') NOT NULL,
    has_tv BOOLEAN DEFAULT TRUE,
    has_internet BOOLEAN DEFAULT TRUE,
    has_minibar BOOLEAN DEFAULT TRUE,
    description TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES room_categories(id)
);

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('guest', 'manager') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    guest_name VARCHAR(100) NOT NULL,
    guest_document VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    arrival_date DATE NOT NULL,
    departure_date DATE NOT NULL,
    num_guests INT NOT NULL,
    payment_method ENUM('credit_card', 'debit_card', 'cash', 'bank_transfer') NOT NULL,
    pension_type ENUM('room_only', 'bed_and_breakfast', 'half_board', 'full_board') NOT NULL,
    cancellation_option BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
); 