# Hotel Management System

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Authentication System](#authentication-system)
- [API Endpoints](#api-endpoints)
- [Frontend Interface](#frontend-interface)
- [Code Structure](#code-structure)
- [Security Features](#security-features)
- [Setup and Installation](#setup-and-installation)

## Overview

This hotel management system is a full-stack web application designed to manage hotel operations including room bookings, user management, and administration. It consists of a Python FastAPI backend API with an SQLAlchemy ORM database layer and a JavaScript/HTML/CSS frontend. The system implements role-based access control distinguishing between hotel guests and managers.

Total codebase: Approximately 1,363 lines of code across Python, JavaScript, HTML, CSS, and SQL files.

## System Architecture

### Backend (Python FastAPI)
- **Framework**: FastAPI provides fast, asynchronous API endpoints with automatic OpenAPI documentation
- **ORM**: SQLAlchemy creates a layer of abstraction for database operations
- **Authentication**: JWT (JSON Web Token) based auth with role-based permissions
- **Database**: SQL database with properly normalized tables and relationships

### Frontend
- **UI Layer**: Vanilla JavaScript with HTML and CSS
- **Authentication**: Client-side JWT token management
- **Role-Based UI**: Separate interfaces for managers and guests
- **Responsive Design**: Mobile-friendly interface

### Communication Flow
1. Frontend makes HTTP requests to backend API endpoints
2. Backend validates requests, processes business logic
3. Database layer handles data persistence
4. Backend returns JSON responses
5. Frontend renders appropriate UI based on responses

## Database Schema

### Room Categories (`room_categories` table)
- **Primary key**: `id` (INT, AUTO_INCREMENT)
- **Fields**:
  - `name` (VARCHAR(50)): Category name (e.g., "Deluxe", "Suite")
  - `description` (TEXT): Detailed description
  - `created_at` (TIMESTAMP): Creation timestamp

### Rooms (`rooms` table)
- **Primary key**: `id` (INT, AUTO_INCREMENT)
- **Foreign keys**: `category_id` references `room_categories(id)`
- **Fields**:
  - `room_number` (VARCHAR(10)): Unique room identifier
  - `price` (DECIMAL(10,2)): Nightly rate
  - `num_beds` (INT): Number of beds
  - `size` (VARCHAR(20)): Room size (e.g., "30m²")
  - `cot_available` (BOOLEAN): Whether extra cots can be added
  - `view_type` (ENUM): 'beach', 'forest', 'city', or 'garden'
  - `has_tv`, `has_internet`, `has_minibar` (BOOLEAN): Amenities
  - `description` (TEXT): Detailed description
  - `image_url` (VARCHAR(255)): Room image
  - `created_at` (TIMESTAMP): Creation timestamp

### Users (`users` table)
- **Primary key**: `id` (INT, AUTO_INCREMENT)
- **Fields**:
  - `username` (VARCHAR(50)): Unique username
  - `email` (VARCHAR(100)): Unique email
  - `password_hash` (VARCHAR(255)): Bcrypt-hashed password
  - `role` (ENUM): 'guest' or 'manager'
  - `full_name` (VARCHAR(100)): User's full name
  - `phone` (VARCHAR(20)): Contact number
  - `created_at` (TIMESTAMP): Account creation timestamp

### Reservations (`reservations` table)
- **Primary key**: `id` (INT, AUTO_INCREMENT)
- **Foreign keys**: 
  - `room_id` references `rooms(id)`
  - `user_id` references `users(id)`
- **Fields**:
  - `guest_name` (VARCHAR(100)): Name of staying guest
  - `guest_document` (VARCHAR(50)): ID/passport number
  - `price` (DECIMAL(10,2)): Total reservation price
  - `arrival_date`, `departure_date` (DATE): Stay period
  - `num_guests` (INT): Number of guests
  - `payment_method` (ENUM): 'credit_card', 'debit_card', 'cash', 'bank_transfer'
  - `pension_type` (ENUM): 'room_only', 'bed_and_breakfast', 'half_board', 'full_board'
  - `cancellation_option` (BOOLEAN): Whether free cancellation is available
  - `status` (ENUM): 'pending', 'confirmed', 'cancelled', 'completed'
  - `created_at` (TIMESTAMP): Booking timestamp

### Relationships
- One-to-many between Room Categories and Rooms
- One-to-many between Users and Reservations
- One-to-many between Rooms and Reservations

## Authentication System

### Backend Authentication (`auth.py`, 51 lines)

#### Password Security
- **Hashing**: Bcrypt algorithm via passlib's CryptContext
- **Verification**: Secure password verification without plaintext exposure
```python
# Password hashing and verification
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

#### JWT Token Management
- **Token Creation**: JWT creation with payload and expiry
- **Token Validation**: Security checks during token verification
```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
```

#### User Authentication Flow
1. User submits credentials to `/api/auth/token` endpoint
2. System verifies username/password
3. If valid, JWT token is generated with user identity and role
4. Token is returned to client for subsequent requests
5. For protected routes, token is extracted and validated
6. User object is retrieved from database based on token claims

### Frontend Authentication (`auth-check.js`, 121 lines)

#### Client Storage
- JWT token stored in browser's localStorage
- User role and name also cached for quick access

#### Authentication Checks
- Token presence and validity checked on page load
- Navigation updated dynamically based on auth status
- Protected routes redirect unauthenticated users
- Role-specific access control (manager vs. guest)

#### User Session Management
```javascript
// Common authentication and user status check script
document.addEventListener('DOMContentLoaded', function() {
    // Check for login token
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('user_role');
    const userName = localStorage.getItem('user_name');
    
    // Handle authentication and access control
    if (token) {
        // User is logged in - update navigation
        updateNavigationForLoggedInUser(userName);
        
        // Page-specific access control
        if (currentPage === 'manager-dashboard.html' && userRole !== 'manager') {
            // Redirect non-managers away from manager dashboard
            window.location.href = 'dashboard.html';
            return;
        }
        // Additional access control logic...
    } else {
        // Handle unauthenticated users...
    }
});
```

## API Endpoints

### Authentication Routes (`backend/routes/auth.py`, 26 lines)
- `POST /api/auth/token`: Authenticates users and issues JWT
  - Request: username, password
  - Response: JWT access token
  - Error cases: Invalid credentials

### User Management (`backend/routes/users.py`, 141 lines)
- `POST /api/users/`: Create new user account
- `GET /api/users/me/`: Get current user's profile
- `GET /api/users/`: List all users (managers only)
- `GET /api/users/{user_id}`: Get specific user details
- `PUT /api/users/{user_id}`: Update user details
- `PUT /api/users/me/`: Update current user's profile
- `DELETE /api/users/{user_id}`: Delete user (managers only)

### Room Management (`backend/routes/rooms.py`, 230 lines)
- `POST /api/rooms/`: Add new room (managers only)
- `GET /api/rooms/`: List all rooms with optional filtering
- `GET /api/rooms/{room_id}`: Get specific room details
- `PUT /api/rooms/{room_id}`: Update room information
- `DELETE /api/rooms/{room_id}`: Remove room from system
- `GET /api/rooms/available`: Find available rooms by date range

### Reservation Management (`backend/routes/reservations.py`, 191 lines)
- `POST /api/reservations/`: Create new reservation
- `GET /api/reservations/`: List reservations (filtered by user role)
- `GET /api/reservations/{reservation_id}`: Get reservation details
- `PUT /api/reservations/{reservation_id}`: Update reservation
- `DELETE /api/reservations/{reservation_id}`: Cancel reservation
- `PUT /api/reservations/{reservation_id}/status`: Update reservation status

### Room Categories (`backend/routes/categories.py`, 94 lines)
- CRUD operations for room categories
- Category listing with optional filtering

### Dashboard Overview (`backend/routes/overview.py`, 76 lines)
- `GET /api/overview/stats`: Get hotel statistics
- `GET /api/overview/recent-activity`: Get recent bookings
- `GET /api/overview/occupancy`: Get room occupancy rates

## Frontend Interface

### Pages
1. **Landing Page** (`index.html`, 511 lines)
   - Hotel showcase and marketing
   - Room search interface
   - Featured rooms and amenities
   - Booking entry point

2. **Authentication Pages**
   - **Login** (`login.html`, 212 lines): User authentication
   - **Registration** (`register.html`, 209 lines): New account creation

3. **User Dashboard** (`dashboard.html`, 311 lines)
   - Guest reservation management
   - Booking history
   - Profile management
   - New reservation creation

4. **Manager Dashboard** (`manager-dashboard.html`, 525 lines)
   - Hotel occupancy overview
   - Financial statistics
   - Room management
   - Reservation administration
   - User management

### JavaScript Modules

1. **Authentication** (`login.js`, 183 lines)
   - Form validation
   - API communication
   - Error handling
   - Token storage

2. **Registration** (`register.js`, 148 lines)
   - User registration form
   - Field validation
   - API communication

3. **Guest Dashboard** (`dashboard.js`, 530 lines)
   - Reservation display and filtering
   - Booking creation interface
   - Profile management
   - Date handling for reservations

4. **Manager Dashboard** (`manager-dashboard.js`, 1,534 lines)
   - Hotel statistics visualization
   - Room management interface
   - Reservation oversight
   - User administration
   - Reporting functionality

5. **Main Features** (`main.js`, 417 lines)
   - Room searching and filtering
   - Date picker integration
   - API communication
   - UI interactions

6. **Authentication Checks** (`auth-check.js`, 121 lines)
   - Token validation
   - Role-based access control
   - Navigation updates

## Code Structure

### Backend Structure
```
backend/
├── __pycache__/
├── routes/                 # API route handlers
│   ├── __pycache__/
│   ├── __init__.py         # 1 line
│   ├── auth.py             # 26 lines - Authentication routes
│   ├── categories.py       # 94 lines - Room category management
│   ├── overview.py         # 76 lines - Dashboard data
│   ├── reservations.py     # 191 lines - Reservation management
│   ├── rooms.py            # 230 lines - Room management
│   └── users.py            # 141 lines - User management
├── .env                    # 12 lines - Environment variables
├── auth.py                 # 51 lines - Authentication logic
├── config.py               # 32 lines - Application configuration
├── database.py             # 15 lines - Database connection
├── main.py                 # 37 lines - Application entry point
├── models.py               # 72 lines - Database models
└── test_overview.py        # 49 lines - Tests
```

### Frontend Structure
```
frontend/
├── css/                    # Stylesheets
├── images/                 # Image assets
├── js/                     # JavaScript modules
│   ├── auth-check.js       # 121 lines - Authentication verification
│   ├── dashboard.js        # 530 lines - Guest dashboard functionality
│   ├── login.js            # 183 lines - Login handling
│   ├── main.js             # 417 lines - Main page functionality
│   ├── manager-dashboard.js # 1,534 lines - Admin functionality
│   └── register.js         # 148 lines - Registration handling
├── dashboard.html          # 311 lines - Guest dashboard
├── index.html              # 511 lines - Landing page
├── login.html              # 212 lines - Login page
├── manager-dashboard.html  # 525 lines - Admin dashboard
└── register.html           # 209 lines - Registration page
```

### Database Structure
```
database/
└── schema.sql              # 57 lines - Database schema
```

## Security Features

### Authentication Security
- **JWT Implementation**: Standards-compliant JWT with proper signing
- **Password Storage**: Bcrypt hashing with appropriate work factor
- **Token Expiration**: Configurable token lifetime
- **HTTPS Support**: Designed for secure transmission

### Authorization Controls
- **Role-Based Access**: Different permissions for guests and managers
- **Resource Protection**: Users can only access their own data
- **Endpoint Security**: All sensitive operations require authentication

### Input Validation
- **Backend Validation**: Pydantic models validate all request data
- **SQL Injection Prevention**: SQLAlchemy ORM prevents injection attacks
- **Frontend Validation**: Client-side validation for better UX

### Error Handling
- **Graceful Failures**: Proper HTTP status codes
- **Informative Messages**: Clear error descriptions
- **Security Logging**: Authentication attempts logged

## Setup and Installation

### Requirements
```
fastapi==0.68.0
pydantic==1.8.2
sqlalchemy==1.4.23
passlib==1.7.4
python-jose==3.3.0
python-multipart==0.0.5
uvicorn==0.15.0
python-dotenv==0.19.0
bcrypt==3.2.0
```

### Environment Variables (.env file)
```
DEBUG=True
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=mysql://user:password@localhost/hotel
HOST=0.0.0.0
PORT=8000
```

### Database Setup
1. Create MySQL database named 'hotel'
2. Run schema.sql to create tables
3. Set proper database connection in .env file

### Running the Application
1. Install dependencies: `pip install -r requirements.txt`
2. Start the backend: `python -m backend.main`
3. Serve the frontend using any web server
4. Access the application at http://localhost:8000

---

This hotel management system demonstrates a comprehensive full-stack web application with proper authentication, authorization, data modeling, and user interface design suitable for real-world hotel operations. 