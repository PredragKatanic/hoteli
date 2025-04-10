const API_CONFIG = {
    BASE_URL: 'http://localhost:8000',
    ENDPOINTS: {
        AUTH: {
            TOKEN: '/api/auth/token',
            ME: '/api/users/me/'
        },
        USERS: {
            BASE: '/api/users/',
            ME: '/api/users/me/'
        },
        ROOMS: {
            BASE: '/api/rooms/',
            CATEGORIES: '/api/rooms/categories/',
            AVAILABLE: '/api/rooms/available/'
        },
        RESERVATIONS: {
            BASE: '/api/reservations/',
            USER: '/api/reservations/user/'
        }
    }
};

// Export the configuration
window.API_CONFIG = API_CONFIG; 