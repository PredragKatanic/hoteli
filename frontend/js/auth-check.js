// Common authentication and user status check script
document.addEventListener('DOMContentLoaded', function() {
    // Check for login token
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('user_role');
    const userName = localStorage.getItem('user_name');
    
    // Get the current page
    const currentPage = window.location.pathname.split('/').pop();
    
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
        
        if (currentPage === 'dashboard.html' && userRole !== 'guest') {
            // Redirect non-guests away from user dashboard
            window.location.href = 'manager-dashboard.html';
            return;
        }
        
        if (currentPage === 'login.html') {
            // Redirect logged-in users based on their role
            if (userRole === 'manager') {
                window.location.href = 'manager-dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
            return;
        }
    } else {
        // User is not logged in
        updateNavigationForLoggedOutUser();
        
        // Prevent access to protected pages
        if (currentPage === 'dashboard.html' || currentPage === 'manager-dashboard.html') {
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Handle logout button if it exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear all authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            // Redirect to home page
            window.location.href = 'index.html';
        });
    }
});

// Update navigation for logged-in users
function updateNavigationForLoggedInUser(userName) {
    // Update login link to show username
    const loginLinks = document.querySelectorAll('a.nav-link[href="login.html"]');
    loginLinks.forEach(link => {
        link.textContent = userName || 'Account';
        link.href = localStorage.getItem('user_role') === 'manager' ? 'manager-dashboard.html' : 'dashboard.html';
    });
    
    // Add logout link if it doesn't exist in nav and there's no logout button elsewhere
    const navbarNav = document.querySelector('#navbarNav .navbar-nav');
    const existingLogoutBtn = document.querySelector('#logoutBtn');
    
    if (navbarNav && !document.querySelector('a.nav-link#logoutNavLink') && !existingLogoutBtn) {
        const listItem = document.createElement('li');
        listItem.className = 'nav-item nav-item-right';
        
        const logoutLink = document.createElement('a');
        logoutLink.className = 'nav-link';
        logoutLink.id = 'logoutNavLink';
        logoutLink.href = '#';
        logoutLink.textContent = 'Logout';
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear all authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            // Redirect to home page
            window.location.href = 'index.html';
        });
        
        listItem.appendChild(logoutLink);
        navbarNav.appendChild(listItem);
    }
    
    // Update any user name placeholders
    const userNameElements = document.querySelectorAll('#userFullName, #managerFullName');
    userNameElements.forEach(element => {
        if (element) element.textContent = userName || 'User';
    });
}

// Update navigation for logged-out users
function updateNavigationForLoggedOutUser() {
    // Ensure login link says "Login"
    const loginLinks = document.querySelectorAll('a.nav-link[href="login.html"]');
    loginLinks.forEach(link => {
        link.textContent = 'Login';
        link.href = 'login.html';
    });
    
    // Remove logout link if it exists
    const logoutLink = document.querySelector('a.nav-link#logoutNavLink');
    if (logoutLink) {
        logoutLink.parentElement.remove();
    }
} 