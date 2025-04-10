document.addEventListener('DOMContentLoaded', function() {
    const guestLoginForm = document.getElementById('guestLoginForm');
    const managerLoginForm = document.getElementById('managerLoginForm');
    const forgotPasswordLinks = document.querySelectorAll('.forgot-password');

    // Check if the user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Check the user role and redirect accordingly
        checkUserRoleAndRedirect(token);
    }

    // Handle guest login
    if (guestLoginForm) {
        guestLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('guestUsername').value;
            const password = document.getElementById('guestPassword').value;

            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.TOKEN}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Get the user's role
                    const userResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS.ME}`, {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        
                        // Check if the user has the guest role
                        if (userData.role === 'guest') {
                            // Store the token and user data
                            localStorage.setItem('token', data.access_token);
                            localStorage.setItem('user_role', userData.role);
                            localStorage.setItem('user_name', userData.full_name);
                            // Redirect to dashboard
                            window.location.href = 'dashboard.html';
                        } else {
                            alert('This login is for guests only. Please use the Hotel Management tab if you are a manager.');
                        }
                    } else {
                        alert('Failed to verify user role. Please try again.');
                    }
                } else {
                    const errorData = await response.json();
                    alert(errorData.detail || 'Invalid username or password');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            }
        });
    }

    // Handle manager login
    if (managerLoginForm) {
        managerLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('managerUsername').value;
            const password = document.getElementById('managerPassword').value;

            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.TOKEN}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Get the user's role
                    const userResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS.ME}`, {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        
                        // Check if the user has the manager role
                        if (userData.role === 'manager') {
                            // Store the token and user data
                            localStorage.setItem('token', data.access_token);
                            localStorage.setItem('user_role', userData.role);
                            localStorage.setItem('user_name', userData.full_name);
                            // Redirect to manager dashboard
                            window.location.href = 'manager-dashboard.html';
                        } else {
                            alert('This login is for hotel management only. Please use the Guest Login tab if you are a guest.');
                        }
                    } else {
                        alert('Failed to verify user role. Please try again.');
                    }
                } else {
                    const errorData = await response.json();
                    alert(errorData.detail || 'Invalid username or password');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            }
        });
    }

    // Handle forgot password links
    if (forgotPasswordLinks) {
        forgotPasswordLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                alert('Please contact our IT administrator at support@hoteleurope.com to reset your password.');
            });
        });
    }

    // Add tab switching animation
    const tabButtons = document.querySelectorAll('.nav-link');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
        });
    });
});

// Check user role and redirect accordingly
async function checkUserRoleAndRedirect(token) {
    try {
        const userResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS.ME}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (userResponse.ok) {
            const userData = await userResponse.json();
            
            // Store user data in localStorage
            localStorage.setItem('user_role', userData.role);
            localStorage.setItem('user_name', userData.full_name);
            
            // Redirect based on role
            if (userData.role === 'manager') {
                if (window.location.pathname.endsWith('login.html')) {
                    window.location.href = 'manager-dashboard.html';
                }
            } else if (userData.role === 'guest') {
                if (window.location.pathname.endsWith('login.html')) {
                    window.location.href = 'dashboard.html';
                }
            }
        } else {
            // If token is invalid, clear it
            localStorage.removeItem('token');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        // If there's an error, clear the token
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
    }
} 