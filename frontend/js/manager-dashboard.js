// Check if user is logged in and is a manager
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('user_role');
    
    // Redirect to login page if not logged in
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Redirect to user dashboard if user is not a manager
    if (userRole !== 'manager') {
        window.location.href = 'dashboard.html';
        return;
    }

    try {
        // Verify token and role
        const response = await fetch('http://localhost:8000/api/users/me/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            window.location.href = 'login.html';
            return;
        }

        const user = await response.json();
        
        // Verify again that the user is actually a manager
        if (user.role !== 'manager') {
            // Redirect non-managers
            window.location.href = 'dashboard.html';
            return;
        }

        // Set manager name in navbar
        document.getElementById('managerFullName').textContent = user.full_name;

        // Load initial data
        loadOverview();
        loadRooms();
        loadUsers();
        loadReservations();
        loadCategories();

        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error:', error);
        window.location.href = 'login.html';
    }
});

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.currentTarget.dataset.section;
            showSection(section);
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        window.location.href = 'index.html';
    });

    // Forms
    document.getElementById('addRoomForm').addEventListener('submit', handleAddRoom);
    document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
    document.getElementById('addCategoryForm').addEventListener('submit', handleAddCategory);
}

// Show selected section
function showSection(section) {
    document.querySelectorAll('.dashboard-section').forEach(div => {
        div.classList.add('d-none');
    });
    document.getElementById(`${section}-section`).classList.remove('d-none');
    
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
}

// Load overview data
async function loadOverview() {
    try {
        // Hide error alert if it was previously shown
        const errorAlert = document.getElementById('overviewErrorAlert');
        if (errorAlert) {
            errorAlert.classList.add('d-none');
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/overview', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to load overview: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        document.getElementById('totalRooms').textContent = data.total_rooms;
        document.getElementById('activeReservations').textContent = data.active_reservations;
        document.getElementById('totalUsers').textContent = data.total_users;

        // Load recent reservations
        const recentReservations = document.getElementById('recentReservations');
        
        if (data.recent_reservations && data.recent_reservations.length > 0) {
            recentReservations.innerHTML = data.recent_reservations.map(reservation => {
                // Display "pending" status as "active"
                let displayStatus = reservation.status;
                if (displayStatus === 'pending') {
                    displayStatus = 'active';
                }
                
                return `
                <tr>
                    <td>${reservation.guest_name}</td>
                    <td>${reservation.room_number}</td>
                    <td>${formatDate(reservation.check_in_date)}</td>
                    <td>${formatDate(reservation.check_out_date)}</td>
                    <td><span class="badge bg-${getStatusColor(reservation.status)}">${displayStatus}</span></td>
                </tr>
            `;
            }).join('');
        } else {
            recentReservations.innerHTML = '<tr><td colspan="5" class="text-center">No recent reservations found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading overview:', error);
        showError('Failed to load overview data. Please try again later.', 'overview');
    }
}

// Format date for display
function formatDate(dateString) {
    try {
        if (!dateString) return 'Invalid date';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        return date.toLocaleDateString();
    } catch (e) {
        console.error('Error formatting date:', e);
        return 'Invalid date';
    }
}

// Check if a date is today or in the future
function isDateActiveOrFuture(dateString) {
    if (!dateString) return false;
    
    try {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
    } catch (e) {
        return false;
    }
}

// Load rooms
async function loadRooms() {
    try {
        const token = localStorage.getItem('token');
        
        // First, get all rooms
        const roomsResponse = await fetch('http://localhost:8000/api/rooms', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!roomsResponse.ok) throw new Error('Failed to load rooms');
        const rooms = await roomsResponse.json();
        
        // Then, get all active reservations to check room availability
        const reservationsResponse = await fetch('http://localhost:8000/api/reservations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!reservationsResponse.ok) throw new Error('Failed to load reservations');
        const reservations = await reservationsResponse.json();
        
        // Get today's date for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // For each room, check if it has an active reservation
        const roomsList = document.getElementById('roomsList');
        roomsList.innerHTML = rooms.map(room => {
            // Check if the room has an active reservation for TODAY specifically
            const activeReservation = reservations.find(res => {
                if (res.room_id !== room.id || res.status === 'cancelled') return false;
                
                // Parse arrival and departure dates
                const arrivalDate = new Date(res.arrival_date);
                const departureDate = new Date(res.departure_date);
                
                // Set hours to 0 for proper date comparison
                arrivalDate.setHours(0, 0, 0, 0);
                departureDate.setHours(0, 0, 0, 0);
                
                // Room is occupied if today is between arrival and departure dates (inclusive)
                return today >= arrivalDate && today <= departureDate;
            });
            
            // Set room status based on reservation status
            const roomStatus = activeReservation ? 'occupied' : 'available';
            
            return `
                <tr>
                    <td>${room.room_number}</td>
                    <td>${room.category_name || 'Uncategorized'}</td>
                    <td>$${room.price}</td>
                    <td>${room.num_beds}</td>
                    <td><span class="badge bg-${roomStatus === 'available' ? 'success' : 'danger'}">${roomStatus}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editRoom(${room.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Load categories for room form
        loadCategoriesForRoomForm();
    } catch (error) {
        console.error('Error loading rooms:', error);
        showError('Failed to load rooms');
    }
}

// Load categories for room form
async function loadCategoriesForRoomForm() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/categories', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load categories');

        const categories = await response.json();
        const categorySelect = document.getElementById('roomCategory');
        
        // Clear existing options except for the default one
        while (categorySelect.options.length > 0) {
            categorySelect.remove(0);
        }
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a category';
        categorySelect.appendChild(defaultOption);
        
        // Add category options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('Failed to load categories');
    }
}

// Load users
async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load users');

        const users = await response.json();
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = users.map(user => `
            <tr>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="badge bg-success">Active</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

// Load reservations
async function loadReservations() {
    try {
        const token = localStorage.getItem('token');
        
        // Get all reservations
        const reservationsResponse = await fetch('http://localhost:8000/api/reservations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!reservationsResponse.ok) throw new Error('Failed to load reservations');
        const reservations = await reservationsResponse.json();
        
        // Get all rooms to match room_id with room_number
        const roomsResponse = await fetch('http://localhost:8000/api/rooms', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!roomsResponse.ok) throw new Error('Failed to load rooms');
        const rooms = await roomsResponse.json();
        
        // Create a map of room_id to room_number for faster lookup
        const roomMap = {};
        rooms.forEach(room => {
            roomMap[room.id] = room.room_number;
        });
        
        const reservationsList = document.getElementById('reservationsList');
        reservationsList.innerHTML = reservations.map(reservation => {
            // Change status display from 'pending' to 'active'
            const displayStatus = reservation.status === 'pending' ? 'active' : reservation.status;
            
            // Get room number from room map
            const roomNumber = roomMap[reservation.room_id] ? `Room ${roomMap[reservation.room_id]}` : 'Unknown room';
            
            return `
                <tr>
                    <td>${reservation.guest_name}</td>
                    <td>${roomNumber}</td>
                    <td>${formatDate(reservation.arrival_date)}</td>
                    <td>${formatDate(reservation.departure_date)}</td>
                    <td><span class="badge bg-${getStatusColor(displayStatus)}">${displayStatus}</span></td>
                    <td>$${reservation.price || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editReservation(${reservation.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteReservation(${reservation.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading reservations:', error);
        showError('Failed to load reservations');
    }
}

// Load categories
async function loadCategories() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/categories', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load categories');

        const categories = await response.json();
        const categoriesList = document.getElementById('categoriesList');
        categoriesList.innerHTML = categories.map(category => `
            <tr>
                <td>${category.name}</td>
                <td>${category.description}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editCategory(${category.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory(${category.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Populate the dropdown for adding rooms
        const roomCategory = document.getElementById('roomCategory');
        roomCategory.innerHTML = categories.map(category => `
            <option value="${category.id}">${category.name}</option>
        `).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('Failed to load categories');
    }
}

// Handle form submissions
async function handleAddRoom(e) {
    e.preventDefault();
    
    // Get form values and validate
    const numBeds = parseInt(document.getElementById('numBeds').value);
    if (numBeds > 4) {
        showError('Maximum 4 beds allowed per room');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const formData = {
            room_number: document.getElementById('roomNumber').value,
            category_id: document.getElementById('roomCategory').value,
            price: document.getElementById('roomPrice').value,
            num_beds: numBeds,
            size: document.getElementById('roomSize').value,
            view_type: document.getElementById('viewType').value,
            description: document.getElementById('roomDescription').value,
            image_url: document.getElementById('roomImage').value,
            has_tv: document.getElementById('hasTV').checked,
            has_internet: document.getElementById('hasInternet').checked,
            has_minibar: document.getElementById('hasMinibar').checked,
            cot_available: document.getElementById('cotAvailable').checked
        };

        const response = await fetch('http://localhost:8000/api/rooms', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            // Log the error response
            const errorBody = await response.json();
            console.error('Detailed error:', errorBody);
            throw new Error('Failed to add room');
        }

        showSuccess('Room added successfully');
        
        // Reset form
        document.getElementById('addRoomForm').reset();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addRoomModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reload rooms
        await loadRooms();
        return; // Return early on success to avoid showing error message
    } catch (error) {
        console.error('Error adding room:', error);
        showError('Failed to add room');
    }
}

// CRUD operations for rooms
async function editRoom(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/rooms/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch room data');
        const room = await response.json();

        // Reset form first to clear any previous data
        document.getElementById('addRoomForm').reset();

        // Update the modal title
        document.querySelector('#addRoomModal .modal-title').textContent = 'Edit Room';
        document.querySelector('#addRoomModal button[type="submit"]').textContent = 'Update Room';

        // Populate form fields with room data
        document.getElementById('roomNumber').value = room.room_number;
        document.getElementById('roomPrice').value = room.price;
        document.getElementById('numBeds').value = room.num_beds;
        document.getElementById('roomSize').value = room.size;
        document.getElementById('viewType').value = room.view_type;
        document.getElementById('roomDescription').value = room.description || '';
        document.getElementById('roomImage').value = room.image_url || '';
        document.getElementById('hasTV').checked = room.has_tv;
        document.getElementById('hasInternet').checked = room.has_internet;
        document.getElementById('hasMinibar').checked = room.has_minibar;
        document.getElementById('cotAvailable').checked = room.cot_available;

        // Make sure categories are loaded before setting the selected option
        await loadCategoriesForRoomForm();
        
        // Set the category dropdown value
        document.getElementById('roomCategory').value = room.category_id;

        // Set form to update mode by adding room ID as a data attribute
        const form = document.getElementById('addRoomForm');
        
        // Explicitly remove previous event handlers to prevent duplicate submissions
        form.removeEventListener('submit', handleAddRoom);
        form.removeEventListener('submit', handleUpdateRoom);
        
        // Store room ID in the form data attribute
        form.dataset.roomId = id;
        
        // Add the new event handler for update
        form.addEventListener('submit', handleUpdateRoom);

        // Show the modal
        const roomModal = new bootstrap.Modal(document.getElementById('addRoomModal'));
        roomModal.show();
    } catch (error) {
        console.error('Error loading room data:', error);
        showError('Failed to load room data');
    }
}

// Setup a function to reset the room form to add mode
function resetRoomFormToAddMode() {
    const form = document.getElementById('addRoomForm');
    
    // Reset the form
    form.reset();
    
    // Remove room ID data attribute
    form.removeAttribute('data-room-id');
    
    // Remove all event handlers
    form.removeEventListener('submit', handleAddRoom);
    form.removeEventListener('submit', handleUpdateRoom);
    
    // Add the add room handler
    form.addEventListener('submit', handleAddRoom);
    
    // Reset modal title and button
    document.querySelector('#addRoomModal .modal-title').textContent = 'Add New Room';
    document.querySelector('#addRoomModal button[type="submit"]').textContent = 'Add Room';
}

// Update the initializeFormsAndListeners function to include user form reset
function initializeFormsAndListeners() {
    // Reset all forms
    document.getElementById('addRoomForm').reset();
    document.getElementById('addUserForm').reset();
    document.getElementById('addCategoryForm').reset();
    
    // Reset form event listeners
    resetRoomFormToAddMode();
    resetUserFormToAddMode();
    resetCategoryFormToAddMode();
    
    const addCategoryForm = document.getElementById('addCategoryForm');
    addCategoryForm.removeEventListener('submit', handleAddCategory);
    addCategoryForm.addEventListener('submit', handleAddCategory);
    
    // Add validation for num_beds field
    document.getElementById('numBeds').addEventListener('input', function() {
        const value = parseInt(this.value);
        if (value > 4) {
            this.value = 4;
            showError('Maximum 4 beds allowed per room');
        } else if (value < 1 || isNaN(value)) {
            this.value = 1;
        }
    });
    
    // Add an event listener to the add room, add user and add category buttons to ensure forms are in add mode
    const addRoomBtn = document.querySelector('button[data-bs-target="#addRoomModal"]');
    if (addRoomBtn) {
        addRoomBtn.addEventListener('click', resetRoomFormToAddMode);
    }
    
    const addUserBtn = document.querySelector('button[data-bs-target="#addUserModal"]');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', resetUserFormToAddMode);
    }
    
    const addCategoryBtn = document.querySelector('button[data-bs-target="#addCategoryModal"]');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', resetCategoryFormToAddMode);
    }
    
    // Add event listeners to all modal close buttons to reset forms
    document.querySelectorAll('.modal .btn-close, .modal .btn-secondary').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.closest('.modal').id;
            if (modalId === 'addRoomModal') {
                resetRoomFormToAddMode();
            } else if (modalId === 'addUserModal') {
                resetUserFormToAddMode();
            } else if (modalId === 'addCategoryModal') {
                resetCategoryFormToAddMode();
            }
        });
    });
}

// Handle room update
async function handleUpdateRoom(e) {
    e.preventDefault();
    
    // Get room ID from form dataset
    const roomId = e.target.dataset.roomId;
    if (!roomId) {
        showError('Room ID not found');
        return;
    }
    
    // Get form values and validate
    const numBeds = parseInt(document.getElementById('numBeds').value);
    if (numBeds > 4) {
        showError('Maximum 4 beds allowed per room');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const formData = {
            room_number: document.getElementById('roomNumber').value,
            category_id: document.getElementById('roomCategory').value,
            price: document.getElementById('roomPrice').value,
            num_beds: numBeds,
            size: document.getElementById('roomSize').value,
            view_type: document.getElementById('viewType').value,
            description: document.getElementById('roomDescription').value,
            image_url: document.getElementById('roomImage').value,
            has_tv: document.getElementById('hasTV').checked,
            has_internet: document.getElementById('hasInternet').checked,
            has_minibar: document.getElementById('hasMinibar').checked,
            cot_available: document.getElementById('cotAvailable').checked
        };

        const response = await fetch(`http://localhost:8000/api/rooms/${roomId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            // Log the error response
            const errorBody = await response.json();
            console.error('Detailed error:', errorBody);
            throw new Error('Failed to update room');
        }

        showSuccess('Room updated successfully');
        
        // Reset the form to add mode
        resetRoomFormToAddMode();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addRoomModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reload rooms
        await loadRooms();
        return; // Return early on success to avoid showing error message
    } catch (error) {
        console.error('Error updating room:', error);
        showError('Failed to update room');
    }
}

async function deleteRoom(id) {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/rooms/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete room');

        showSuccess('Room deleted successfully');
        loadRooms();
    } catch (error) {
        console.error('Error deleting room:', error);
        showError('Failed to delete room');
    }
}

// Verify user has manager role
async function verifyManagerRole() {
    const token = localStorage.getItem('token');
    if (!token) {
        showError('You need to be logged in');
        return false;
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/users/me/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to verify user permissions');
        }
        
        const user = await response.json();
        
        if (user.role !== 'manager') {
            showError('You need manager permissions to perform this operation');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error verifying permissions:', error);
        showError('Failed to verify permissions: ' + error.message);
        return false;
    }
}

// CRUD operations for users
async function editUser(id) {
    if (!await verifyManagerRole()) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/users/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user data');
        const user = await response.json();

        // Reset form first to clear any previous data
        document.getElementById('addUserForm').reset();

        // Update the modal title
        document.querySelector('#addUserModal .modal-title').textContent = 'Edit User';
        document.querySelector('#addUserModal button[type="submit"]').textContent = 'Update User';

        // Populate form fields with user data
        document.getElementById('userFullName').value = user.full_name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userPassword').value = ''; // Don't show password
        document.getElementById('userRole').value = user.role;
        document.getElementById('userPhone').value = user.phone || '';

        // Set form to update mode by adding user ID as a data attribute
        const form = document.getElementById('addUserForm');
        
        // Explicitly remove previous event handlers to prevent duplicate submissions
        form.removeEventListener('submit', handleAddUser);
        form.removeEventListener('submit', handleUpdateUser);
        
        // Store user ID in the form data attribute
        form.dataset.userId = id;
        
        // Add the new event handler for update
        form.addEventListener('submit', handleUpdateUser);

        // Show the modal
        const userModal = new bootstrap.Modal(document.getElementById('addUserModal'));
        userModal.show();
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load user data');
    }
}

// Setup a function to reset the user form to add mode
function resetUserFormToAddMode() {
    const form = document.getElementById('addUserForm');
    
    // Reset the form
    form.reset();
    
    // Remove user ID data attribute
    form.removeAttribute('data-user-id');
    
    // Remove all event handlers
    form.removeEventListener('submit', handleAddUser);
    form.removeEventListener('submit', handleUpdateUser);
    
    // Add the add user handler
    form.addEventListener('submit', handleAddUser);
    
    // Reset modal title and button
    document.querySelector('#addUserModal .modal-title').textContent = 'Add New User';
    document.querySelector('#addUserModal button[type="submit"]').textContent = 'Add User';
}

// Handle user update
async function handleUpdateUser(e) {
    e.preventDefault();
    
    // Get user ID from form dataset
    const userId = e.target.dataset.userId;
    if (!userId) {
        showError('User ID not found');
        return;
    }
    
    // Verify manager role
    if (!await verifyManagerRole()) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        // For update, we don't include password if it's empty
        const formData = {
            full_name: document.getElementById('userFullName').value,
            email: document.getElementById('userEmail').value,
            username: document.getElementById('userUsername').value,
            role: document.getElementById('userRole').value,
            phone: document.getElementById('userPhone').value
        };
        
        // Only include password if it's provided (not empty)
        const password = document.getElementById('userPassword').value;
        if (password) {
            formData.password = password;
        }

        const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Detailed error:', errorData);
            throw new Error(`Failed to update user: ${errorData.detail || 'Unknown error'}`);
        }

        showSuccess('User updated successfully');
        
        // Reset form to add mode
        resetUserFormToAddMode();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reload users
        loadUsers();
        return; // Return early to avoid showing error message
    } catch (error) {
        console.error('Error updating user:', error);
        showError('Failed to update user: ' + error.message);
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    // Verify manager role
    if (!await verifyManagerRole()) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:8000/api/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Get error details
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(`Failed to delete user: ${errorData.detail || 'Unknown error'}`);
        }

        showSuccess('User deleted successfully');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user: ' + error.message);
    }
}

// CRUD operations for reservations
async function editReservation(id) {
    try {
        // Get the reservation details
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/reservations/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch reservation data');
        const reservation = await response.json();

        // Create a modal if it doesn't exist
        let editReservationModal = document.getElementById('editReservationModal');
        if (!editReservationModal) {
            // Create the modal HTML
            const modalHTML = `
            <div class="modal fade" id="editReservationModal" tabindex="-1" aria-labelledby="editReservationModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editReservationModalLabel">Edit Reservation</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editReservationForm">
                                <div class="mb-3">
                                    <label for="editGuestName" class="form-label">Guest Name</label>
                                    <input type="text" class="form-control" id="editGuestName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editGuestDocument" class="form-label">Guest Document</label>
                                    <input type="text" class="form-control" id="editGuestDocument" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editRoomId" class="form-label">Room</label>
                                    <select class="form-control" id="editRoomId" required>
                                        <option value="">Select Room</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="editArrivalDate" class="form-label">Arrival Date</label>
                                    <input type="date" class="form-control" id="editArrivalDate" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editDepartureDate" class="form-label">Departure Date</label>
                                    <input type="date" class="form-control" id="editDepartureDate" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editNumGuests" class="form-label">Number of Guests</label>
                                    <input type="number" class="form-control" id="editNumGuests" min="1" max="4" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editPrice" class="form-label">Price</label>
                                    <input type="number" class="form-control" id="editPrice" min="0" step="0.01" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editPaymentMethod" class="form-label">Payment Method</label>
                                    <select class="form-control" id="editPaymentMethod" required>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="debit_card">Debit Card</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="editPensionType" class="form-label">Pension Type</label>
                                    <select class="form-control" id="editPensionType" required>
                                        <option value="room_only">Room Only</option>
                                        <option value="bed_and_breakfast">Bed & Breakfast</option>
                                        <option value="half_board">Half Board</option>
                                        <option value="full_board">Full Board</option>
                                    </select>
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="editCancellationOption">
                                    <label class="form-check-label" for="editCancellationOption">Cancellation Option</label>
                                </div>
                                <div class="mb-3">
                                    <label for="editStatus" class="form-label">Status</label>
                                    <select class="form-control" id="editStatus" required>
                                        <option value="pending">Active</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="saveReservationBtn">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            editReservationModal = document.getElementById('editReservationModal');
            
            // Add event listener to the save button
            document.getElementById('saveReservationBtn').addEventListener('click', handleUpdateReservation);
        }

        // Load all available rooms to the dropdown
        const roomsResponse = await fetch('http://localhost:8000/api/rooms', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!roomsResponse.ok) throw new Error('Failed to fetch rooms');
        const rooms = await roomsResponse.json();
        
        const roomSelect = document.getElementById('editRoomId');
        roomSelect.innerHTML = '<option value="">Select Room</option>';
        rooms.forEach(room => {
            roomSelect.innerHTML += `<option value="${room.id}">Room ${room.room_number}</option>`;
        });

        // Populate form with reservation data
        document.getElementById('editGuestName').value = reservation.guest_name;
        document.getElementById('editGuestDocument').value = reservation.guest_document;
        document.getElementById('editRoomId').value = reservation.room_id;
        document.getElementById('editArrivalDate').value = reservation.arrival_date;
        document.getElementById('editDepartureDate').value = reservation.departure_date;
        document.getElementById('editNumGuests').value = reservation.num_guests;
        document.getElementById('editPrice').value = reservation.price;
        document.getElementById('editPaymentMethod').value = reservation.payment_method;
        document.getElementById('editPensionType').value = reservation.pension_type;
        document.getElementById('editCancellationOption').checked = reservation.cancellation_option;
        document.getElementById('editStatus').value = reservation.status;
        
        // Store the reservation ID in a data attribute
        const form = document.getElementById('editReservationForm');
        form.dataset.reservationId = id;
        
        // Show the modal
        const modal = new bootstrap.Modal(editReservationModal);
        modal.show();
    } catch (error) {
        console.error('Error loading reservation data:', error);
        showError('Failed to load reservation data');
    }
}

// Handle reservation update
async function handleUpdateReservation() {
    const form = document.getElementById('editReservationForm');
    const reservationId = form.dataset.reservationId;
    
    if (!reservationId) {
        showError('Reservation ID not found');
        return;
    }
    
    // Validate number of guests
    const numGuests = parseInt(document.getElementById('editNumGuests').value);
    if (numGuests > 4) {
        showError('Maximum 4 guests allowed per reservation');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const formData = {
            room_id: document.getElementById('editRoomId').value,
            guest_name: document.getElementById('editGuestName').value,
            guest_document: document.getElementById('editGuestDocument').value,
            arrival_date: document.getElementById('editArrivalDate').value,
            departure_date: document.getElementById('editDepartureDate').value,
            num_guests: numGuests,
            price: parseFloat(document.getElementById('editPrice').value),
            payment_method: document.getElementById('editPaymentMethod').value,
            pension_type: document.getElementById('editPensionType').value,
            cancellation_option: document.getElementById('editCancellationOption').checked
        };

        const response = await fetch(`http://localhost:8000/api/reservations/${reservationId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Detailed error:', errorData);
            throw new Error('Failed to update reservation');
        }

        showSuccess('Reservation updated successfully');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editReservationModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reload reservations
        await loadReservations();
    } catch (error) {
        console.error('Error updating reservation:', error);
        showError('Failed to update reservation: ' + error.message);
    }
}

async function deleteReservation(id) {
    if (confirm('Are you sure you want to delete this reservation?')) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/reservations/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                throw new Error(`Failed to delete reservation: ${response.status} ${response.statusText}`);
            }

            showSuccess('Reservation deleted successfully');
            loadReservations();
        } catch (error) {
            console.error('Error deleting reservation:', error);
            showError('Failed to delete reservation');
        }
    }
}

// CRUD operations for categories
async function editCategory(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/categories/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch category data');
        const category = await response.json();

        // Reset form first to clear any previous data
        document.getElementById('addCategoryForm').reset();

        // Update the modal title
        document.querySelector('#addCategoryModal .modal-title').textContent = 'Edit Category';
        document.querySelector('#addCategoryModal button[type="submit"]').textContent = 'Update Category';

        // Populate form fields with category data
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryDescription').value = category.description || '';

        // Set form to update mode by adding category ID as a data attribute
        const form = document.getElementById('addCategoryForm');
        
        // Explicitly remove previous event handlers to prevent duplicate submissions
        form.removeEventListener('submit', handleAddCategory);
        form.removeEventListener('submit', handleUpdateCategory);
        
        // Store category ID in the form data attribute
        form.dataset.categoryId = id;
        
        // Add the new event handler for update
        form.addEventListener('submit', handleUpdateCategory);

        // Show the modal
        const categoryModal = new bootstrap.Modal(document.getElementById('addCategoryModal'));
        categoryModal.show();
    } catch (error) {
        console.error('Error loading category data:', error);
        showError('Failed to load category data');
    }
}

// Setup a function to reset the category form to add mode
function resetCategoryFormToAddMode() {
    const form = document.getElementById('addCategoryForm');
    
    // Reset the form
    form.reset();
    
    // Remove category ID data attribute
    form.removeAttribute('data-category-id');
    
    // Remove all event handlers
    form.removeEventListener('submit', handleAddCategory);
    form.removeEventListener('submit', handleUpdateCategory);
    
    // Add the add category handler
    form.addEventListener('submit', handleAddCategory);
    
    // Reset modal title and button
    document.querySelector('#addCategoryModal .modal-title').textContent = 'Add New Category';
    document.querySelector('#addCategoryModal button[type="submit"]').textContent = 'Add Category';
}

// Handle category update
async function handleUpdateCategory(e) {
    e.preventDefault();
    
    // Get category ID from form dataset
    const categoryId = e.target.dataset.categoryId;
    if (!categoryId) {
        showError('Category ID not found');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const formData = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value
        };

        const response = await fetch(`http://localhost:8000/api/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Detailed error:', errorData);
            throw new Error('Failed to update category');
        }

        showSuccess('Category updated successfully');
        
        // Reset form to add mode
        resetCategoryFormToAddMode();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reload categories
        loadCategories();
        return; // Return early to avoid showing error message
    } catch (error) {
        console.error('Error updating category:', error);
        showError('Failed to update category: ' + error.message);
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`            }
        });

        if (!response.ok) throw new Error('Failed to delete category');

        showSuccess('Category deleted successfully');
        loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        showError('Failed to delete category');
    }
}

// Handle user form submission
async function handleAddUser(e) {
    e.preventDefault();
    
    // Verify manager role
    if (!await verifyManagerRole()) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        // Get the user's full name from the form
        const fullNameField = document.getElementById('userFullName') || document.getElementById('userName');
        
        // Check which field names exist in the form
        const formData = {
            username: document.getElementById('userUsername').value,
            email: document.getElementById('userEmail').value,
            password: document.getElementById('userPassword').value,
            role: document.getElementById('userRole').value
        };
        
        // Add full_name using whichever field exists
        if (fullNameField) {
            formData.full_name = fullNameField.value;
        }
        
        // Add phone if the field exists
        const phoneField = document.getElementById('userPhone');
        if (phoneField) {
            formData.phone = phoneField.value;
        }

        console.log('Sending user data:', formData);

        const response = await fetch('http://localhost:8000/api/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(`Failed to add user: ${errorData.detail || 'Unknown error'}`);
        }

        showSuccess('User added successfully');
        document.getElementById('addUserForm').reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        if (modal) {
            modal.hide();
        }
        loadUsers();
    } catch (error) {
        console.error('Error adding user:', error);
        showError('Failed to add user: ' + error.message);
    }
}

// Handle category form submission
async function handleAddCategory(e) {
    e.preventDefault();
    try {
        const token = localStorage.getItem('token');
        const formData = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value
        };

        const response = await fetch('http://localhost:8000/api/categories', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to add category');

        showSuccess('Category added successfully');
        document.getElementById('addCategoryForm').reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
        if (modal) {
            modal.hide();
        }
        loadCategories();
    } catch (error) {
        console.error('Error adding category:', error);
        showError('Failed to add category');
    }
}

// Utility functions
function getStatusColor(status) {
    if (!status) return 'secondary';
    
    switch (status.toLowerCase()) {
        case 'active':
        case 'confirmed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'cancelled':
            return 'danger';
        case 'completed':
            return 'info';
        case 'occupied':
            return 'danger';
        case 'available':
            return 'success';
        default:
            return 'secondary';
    }
}

function showSuccess(message) {
    // Create a success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert alert at the top of the main content area
    const mainContent = document.querySelector('.col-md-9');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // Automatically dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 500);
        }
    }, 5000);
}

function showError(message, section = null) {
    console.error(message);
    
    // If a specific section alert exists, show it
    if (section) {
        const sectionAlert = document.getElementById(`${section}ErrorAlert`);
        if (sectionAlert) {
            sectionAlert.textContent = message;
            sectionAlert.classList.remove('d-none');
            return;
        }
    }
    
    // Otherwise create a general error alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert alert at the top of the main content area
    const mainContent = document.querySelector('.col-md-9');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // Automatically dismiss after 10 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 500);
        }
    }, 10000);
}

// When document is ready
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Setup event listeners
        setupEventListeners();
    
    // Load data
    loadOverview();
    loadRooms();
    loadUsers();
    loadReservations();
    loadCategories();
    } catch (error) {
        console.error('Error:', error);
        window.location.href = 'login.html';
    }
}); 
