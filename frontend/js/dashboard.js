// Check if user is logged in
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('user_role');
    
    // Redirect to login page if not logged in
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Redirect to manager dashboard if user is a manager
    if (userRole === 'manager') {
        window.location.href = 'manager-dashboard.html';
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

        const userData = await response.json();
        
        // If not a guest, redirect to appropriate page
        if (userData.role !== 'guest') {
            if (userData.role === 'manager') {
                window.location.href = 'manager-dashboard.html';
            } else {
                // If unknown role, go to login
                window.location.href = 'login.html';
            }
            return;
        }
        
        // Load user profile
        await loadUserProfile();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        loadAvailableRooms();
        loadUserReservations();
        
        // Set min date for checkin/checkout to today
        setMinDates();
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
    document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
    document.getElementById('newReservationForm').addEventListener('submit', handleNewReservation);
    
    // Set max guests
    const numGuestsInput = document.getElementById('numGuests');
    if (numGuestsInput) {
        numGuestsInput.setAttribute('max', '4');
    }
    
    // Check-in date change
    const checkInDate = document.getElementById('checkInDate');
    if (checkInDate) {
        checkInDate.addEventListener('change', () => {
            // Set checkout min date to be at least check-in date
            const checkOutDate = document.getElementById('checkOutDate');
            if (checkOutDate) {
                checkOutDate.min = checkInDate.value;
                
                // If checkout is before checkin, update it
                if (checkOutDate.value && new Date(checkOutDate.value) < new Date(checkInDate.value)) {
                    checkOutDate.value = checkInDate.value;
                }
            }
        });
    }
}

// Set minimum dates for check-in and check-out
function setMinDates() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${yyyy}-${mm}-${dd}`;
    
    const checkInDate = document.getElementById('checkInDate');
    const checkOutDate = document.getElementById('checkOutDate');
    
    if (checkInDate) {
        checkInDate.min = formattedToday;
    }
    
    if (checkOutDate) {
        checkOutDate.min = formattedToday;
    }
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

// Function to select a room and redirect to reservation form
function selectRoom(roomId) {
    // Set the selected room in the dropdown
    const roomSelect = document.getElementById('roomSelect');
    if (roomSelect) {
        for (let i = 0; i < roomSelect.options.length; i++) {
            if (roomSelect.options[i].value == roomId) {
                roomSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    // Switch to new reservation section
    showSection('new-reservation');
}

// Format date to display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Format date for Member Since
function formatMemberSince(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Load user profile
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/users/me/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load profile');

        const user = await response.json();
        
        // Update navbar
        document.getElementById('userFullName').textContent = user.full_name;
        
        // Update profile section
        document.getElementById('profileFullName').textContent = user.full_name;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profilePhone').textContent = user.phone || 'Not provided';
        document.getElementById('profileRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        
        // Format and display member since date
        const memberSinceElement = document.getElementById('profileMemberSince');
        if (memberSinceElement) {
            memberSinceElement.textContent = formatMemberSince(user.created_at);
        }
        
        // Update edit profile form
        document.getElementById('editFullName').value = user.full_name;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editPhone').value = user.phone || '';
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile');
    }
}

// Load available rooms
async function loadAvailableRooms() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/rooms/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load rooms');

        const rooms = await response.json();
        
        // Update rooms list
        const roomsList = document.getElementById('roomsList');
        roomsList.innerHTML = rooms.map(room => `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="room-image-container">
                        ${room.image_url 
                            ? `<img src="${room.image_url}" class="room-image" alt="Room ${room.room_number}">`
                            : `<div class="room-image-placeholder">
                                <i class="fas fa-bed fa-2x mb-2"></i><br>
                                No image available
                               </div>`
                        }
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">Room ${room.room_number}</h5>
                        <p class="card-text">${room.description || 'No description available'}</p>
                        <ul class="list-unstyled">
                            <li><i class="fas fa-bed"></i> ${room.num_beds} Beds</li>
                            <li><i class="fas fa-ruler"></i> ${room.size}</li>
                            <li><i class="fas fa-dollar-sign"></i> $${room.price}/night</li>
                        </ul>
                        <div class="mt-3">
                            <button class="btn btn-primary" onclick="selectRoom(${room.id})">
                                Select Room
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Update room select in new reservation form
        const roomSelect = document.getElementById('roomSelect');
        roomSelect.innerHTML = rooms.map(room => `
            <option value="${room.id}">Room ${room.room_number} - $${room.price}/night</option>
        `).join('');
    } catch (error) {
        console.error('Error loading rooms:', error);
        showError('Failed to load rooms');
    }
}

// Load user reservations
async function loadUserReservations() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/reservations/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load reservations');

        const reservations = await response.json();
        
        // Update reservations list
        const reservationsList = document.getElementById('reservationsList');
        reservationsList.innerHTML = reservations.map(reservation => {
            // Change status from 'pending' to 'active' for display
            const displayStatus = reservation.status === 'pending' ? 'active' : reservation.status;
            
            return `
                <tr>
                    <td>${reservation.room_number ? `Room ${reservation.room_number}` : 'Room not specified'}</td>
                    <td>${formatDate(reservation.arrival_date)}</td>
                    <td>${formatDate(reservation.departure_date)}</td>
                    <td><span class="badge bg-${getStatusColor(displayStatus)}">${displayStatus}</span></td>
                    <td>$${reservation.price}</td>
                    <td>
                        ${reservation.status === 'pending' || reservation.status === 'confirmed' ? 
                            `<button class="btn btn-sm btn-danger" onclick="checkCancellation(${reservation.id}, ${reservation.cancellation_option})">
                                Cancel
                            </button>` : ''
                        }
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading reservations:', error);
        showError('Failed to load reservations');
    }
}

// Check if cancellation is allowed before proceeding
function checkCancellation(reservationId, cancellationOption) {
    if (!cancellationOption) {
        showError("You didn't select the cancellation option when making this reservation. Cancellation is not available.");
        return;
    }
    
    cancelReservation(reservationId);
}

// Handle edit profile
async function handleEditProfile(e) {
    e.preventDefault();
    try {
        const token = localStorage.getItem('token');
        const formData = {
            username: document.getElementById('profileUsername').textContent,
            full_name: document.getElementById('editFullName').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value
        };

        const response = await fetch('http://localhost:8000/api/users/me/', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update profile');
        }

        showSuccess('Profile updated successfully');
        const modalElement = document.getElementById('editProfileModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        } else {
            // If modal instance not found, hide it manually
            modalElement.classList.remove('show');
            modalElement.style.display = 'none';
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
        }
        
        // Reload profile after update
        await loadUserProfile();
    } catch (error) {
        console.error('Error updating profile:', error);
        showError(error.message || 'Failed to update profile');
    }
}

// Handle new reservation
async function handleNewReservation(e) {
    e.preventDefault();
    
    // Get form values
    const numGuests = parseInt(document.getElementById('numGuests').value);
    
    // Validate number of guests
    if (numGuests > 4) {
        showError('Maximum 4 guests allowed per room');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const formData = {
            room_id: document.getElementById('roomSelect').value,
            guest_name: document.getElementById('profileFullName').textContent,
            guest_document: "ID", // You might want to add this field to the form
            price: calculateTotalPrice(),
            arrival_date: document.getElementById('checkInDate').value,
            departure_date: document.getElementById('checkOutDate').value,
            num_guests: numGuests,
            payment_method: document.getElementById('paymentMethod').value,
            pension_type: document.getElementById('pensionType').value,
            cancellation_option: document.getElementById('cancellationOption').checked
        };

        const response = await fetch('http://localhost:8000/api/reservations/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create reservation');
        }

        showSuccess('Reservation created successfully');
        e.target.reset();
        await loadUserReservations();
        showSection('reservations'); // Switch to reservations section after successful booking
    } catch (error) {
        console.error('Error creating reservation:', error);
        showError(error.message || 'Failed to create reservation');
    }
}

// Cancel reservation
async function cancelReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/reservations/${reservationId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to cancel reservation');
        }

        showSuccess('Reservation cancelled successfully');
        await loadUserReservations();
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        showError(error.message || 'Failed to cancel reservation');
    }
}

// Utility functions
function getStatusColor(status) {
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
        default:
            return 'secondary';
    }
}

function calculateTotalPrice() {
    const roomSelect = document.getElementById('roomSelect');
    const selectedOption = roomSelect.options[roomSelect.selectedIndex];
    const priceText = selectedOption.text.split('$')[1];
    const pricePerNight = parseFloat(priceText);
    const checkIn = new Date(document.getElementById('checkInDate').value);
    const checkOut = new Date(document.getElementById('checkOutDate').value);
    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    return pricePerNight * nights;
}

function showSuccess(message) {
    // Create a success toast
    createToast(message, 'success');
}

function showError(message) {
    // Create an error toast
    createToast(message, 'danger');
}

// Create a toast notification
function createToast(message, type = 'success') {
    // Check if toast container exists, otherwise create it
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Create toast content
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toastEl);
    
    // Initialize and show toast
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
} 