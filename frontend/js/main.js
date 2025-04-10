// Main JavaScript for Hotel Europe website
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all necessary components
    initNavbarScrollEffect();
    initSmoothScrolling();
    initDateInputs();
    initializeRoomCardImages();
    initAvailabilityForm();
    initContactForm();
    loadRoomCategories();
});

// Navbar scroll effect
function initNavbarScrollEffect() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Set up date constraints for check-in and check-out
function initDateInputs() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    
    if (!checkInInput || !checkOutInput) return;
    
    // Set min date to today for check-in
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    checkInInput.min = todayString;
    
    // Update min date for check-out when check-in changes
    checkInInput.addEventListener('change', function() {
        const checkInDate = new Date(this.value);
        const nextDay = new Date(checkInDate);
        nextDay.setDate(nextDay.getDate() + 1);
        checkOutInput.min = nextDay.toISOString().split('T')[0];
        
        // If check-out date is now invalid, update it
        if (new Date(checkOutInput.value) <= checkInDate) {
            checkOutInput.value = nextDay.toISOString().split('T')[0];
        }
    });
}

// Initialize room card images with placeholder backgrounds if images fail to load
function initializeRoomCardImages() {
    const processedClass = 'carousel-img-processed';
    
    document.querySelectorAll('.carousel-item img').forEach(img => {
        // Skip if already processed or no src
        if (img.classList.contains(processedClass) || !img.src) return;
        
        // Mark as processed to avoid duplicate processing if the script runs multiple times
        img.classList.add(processedClass);
        
        // Get the room type from alt text or data attribute
        let roomType = 'Standard';
        if (img.alt) {
            if (img.alt.toLowerCase().includes('deluxe')) {
                roomType = 'Deluxe';
            } else if (img.alt.toLowerCase().includes('suite') || img.alt.toLowerCase().includes('luxury')) {
                roomType = 'Suite';
            }
        }
        
        // Handle if image fails to load
        img.onerror = function() {
            // Hide the image
            this.style.display = 'none';
            
            // Style the parent container with a gradient background based on room type
            const carouselItem = this.closest('.carousel-item');
            if (carouselItem) {
                let gradient = 'linear-gradient(45deg, #1a4b84, #346fa8)'; // Default (Standard)
                
                if (roomType === 'Deluxe') {
                    gradient = 'linear-gradient(45deg, #4b1a84, #6a34a8)';
                } else if (roomType === 'Suite') {
                    gradient = 'linear-gradient(45deg, #996515, #d4af37)';
                }
                
                carouselItem.style.background = gradient;
                carouselItem.style.height = '250px';
                
                // Add placeholder text if not already there
                if (!carouselItem.querySelector('.placeholder-text')) {
                    const placeholderText = document.createElement('div');
                    placeholderText.className = 'placeholder-text';
                    placeholderText.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; font-weight:bold; text-align:center;';
                    placeholderText.innerText = this.alt || roomType + ' Room';
                    carouselItem.appendChild(placeholderText);
                }
            }
        };
        
        // Trigger error handler if image is already broken
        if (img.complete && img.naturalWidth === 0) {
            img.onerror();
        }
    });
}

// Handle availability form submission
function initAvailabilityForm() {
    const availabilityForm = document.getElementById('availabilityForm');
    if (!availabilityForm) return;
    
    availabilityForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await checkAvailability();
    });
}

// Function to check availability based on form inputs
async function checkAvailability() {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const guests = document.getElementById('guests').value;
    const roomCategory = document.getElementById('roomCategory').value;
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!checkIn || !checkOut) {
        resultsContainer.innerHTML = '<div class="alert alert-warning">Please select check-in and check-out dates.</div>';
        return;
    }
    
    // Show loading indicator
    resultsContainer.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Checking availability...</p></div>';
    
    // Make the results section visible
    document.getElementById('availabilityResults').classList.add('show');
    
    try {
        // Build the URL for the API request
        let apiUrl = `http://localhost:8000/api/rooms?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`;
        
        // Only add category_id if not "all"
        if (roomCategory !== 'all') {
            apiUrl += `&category_id=${roomCategory}`;
        }
        
        // Try to fetch from API with the correct endpoint
        const response = await fetch(apiUrl);
        
        if (response.ok) {
            const data = await response.json();
            displayAvailabilityResults(data, checkIn, checkOut, guests);
        } else {
            // If API call fails, use mock data
            console.warn('API call failed, using mock data');
            const mockRooms = getMockRoomData(roomCategory);
            displayAvailabilityResults(mockRooms, checkIn, checkOut, guests);
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        // Use mock data as fallback
        const mockRooms = getMockRoomData(roomCategory);
        displayAvailabilityResults(mockRooms, checkIn, checkOut, guests);
    }
}

// Display availability results in the container
function displayAvailabilityResults(rooms, checkIn, checkOut, guests) {
    const resultsContainer = document.getElementById('resultsContainer');
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    if (rooms.length === 0) {
        resultsContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">No rooms available for the selected dates. Please try different dates or room category.</div></div>';
        return;
    }
    
    // Limit to maximum 3 rooms to avoid generating too many cards
    const limitedRooms = rooms.slice(0, 3);
    
    // Display each available room
    limitedRooms.forEach(room => {
        const totalPrice = parseFloat(room.price) * nights;
        
        // Get gradient based on room category
        let gradient = 'linear-gradient(45deg, #1a4b84, #346fa8)'; // Default (Standard)
        if (room.category_name === 'Deluxe') {
            gradient = 'linear-gradient(45deg, #4b1a84, #6a34a8)';
        } else if (room.category_name === 'Luxury Suite' || room.category_name === 'Suite') {
            gradient = 'linear-gradient(45deg, #996515, #d4af37)';
        }
        
        const resultHTML = `
            <div class="col-md-12 mb-3">
                <div class="result-card">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            ${room.image_url ? 
                                `<img src="${room.image_url}" alt="${room.category_name} Room ${room.room_number}" class="img-fluid rounded room-image" 
                                    style="height: 160px; object-fit: cover; width: 100%;" 
                                    onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\'height: 160px; ${gradient}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; position: relative;\\'><span>${room.category_name} Room ${room.room_number}</span></div>';">` :
                                `<div style="height: 160px; background: ${gradient}; 
                                     border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; position: relative; overflow: hidden;">
                                     <span style="position: relative; z-index: 2; text-align: center; padding: 10px;">${room.category_name} Room ${room.room_number}</span>
                                </div>`
                            }
                        </div>
                        <div class="col-md-6">
                            <h5>${room.category_name || 'Standard'} Room ${room.room_number}</h5>
                            <p>${room.description || 'Comfortable room with modern amenities.'}</p>
                            <div class="room-features">
                                <span class="badge bg-light text-dark me-2"><i class="fas fa-bed"></i> ${room.num_beds} Beds</span>
                                <span class="badge bg-light text-dark me-2"><i class="fas fa-mountain"></i> ${room.view_type} View</span>
                                <span class="badge bg-light text-dark me-2"><i class="fas fa-ruler-combined"></i> ${room.size}</span>
                            </div>
                            <p class="mb-0 mt-2"><strong>Check-in:</strong> ${new Date(checkIn).toLocaleDateString()}</p>
                            <p class="mb-0"><strong>Check-out:</strong> ${new Date(checkOut).toLocaleDateString()}</p>
                            <p class="mb-0"><strong>Guests:</strong> ${guests}</p>
                        </div>
                        <div class="col-md-3 text-end">
                            <p class="mb-1"><strong>€${room.price}</strong> per night</p>
                            <p class="mb-3"><strong>€${totalPrice}</strong> total for ${nights} nights</p>
                            <a href="login.html" class="btn btn-primary">Book Now</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        resultsContainer.innerHTML += resultHTML;
    });
    
    // If there are more rooms than we're showing, display a message
    if (rooms.length > 3) {
        resultsContainer.innerHTML += `
            <div class="col-md-12">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i> 
                    Showing 3 of ${rooms.length} available rooms. Please refine your search criteria for more specific results.
                </div>
            </div>
        `;
    }
}

// Get mock room data when API is not available
function getMockRoomData(roomCategory) {
    const mockRooms = [];
    
    // Convert to string if it's a number
    const categoryId = roomCategory.toString();
    
    // Add standard rooms
    if (categoryId === 'all' || categoryId === '1' || categoryId === 'standard') {
        mockRooms.push({
            room_id: 1,
            room_number: '101',
            category_name: 'Standard',
            category_id: 1,
            price: 89,
            description: 'Comfortable standard room with city view',
            num_beds: 1,
            view_type: 'City',
            size: '25m²',
            image_url: 'images/rooms/standard1.svg'
        }, {
            room_id: 2,
            room_number: '102',
            category_name: 'Standard',
            category_id: 1,
            price: 92,
            description: 'Comfortable standard room with courtyard view',
            num_beds: 2,
            view_type: 'Courtyard',
            size: '25m²',
            image_url: 'images/rooms/standard1.svg'
        });
    }
    
    // Add deluxe rooms
    if (categoryId === 'all' || categoryId === '2' || categoryId === 'deluxe') {
        mockRooms.push({
            room_id: 3,
            room_number: '201',
            category_name: 'Deluxe',
            category_id: 2,
            price: 129,
            description: 'Spacious deluxe room with garden view',
            num_beds: 1,
            view_type: 'Garden',
            size: '35m²',
            image_url: 'images/rooms/deluxe1.svg'
        }, {
            room_id: 4,
            room_number: '202',
            category_name: 'Deluxe',
            category_id: 2,
            price: 139,
            description: 'Deluxe room with balcony and partial sea view',
            num_beds: 1,
            view_type: 'Partial Sea',
            size: '38m²',
            image_url: 'images/rooms/deluxe1.svg'
        });
    }
    
    // Add luxury suites
    if (categoryId === 'all' || categoryId === '3' || categoryId === 'suite') {
        mockRooms.push({
            room_id: 5,
            room_number: '301',
            category_name: 'Luxury Suite',
            category_id: 3,
            price: 199,
            description: 'Luxury suite with panoramic ocean view',
            num_beds: 1,
            view_type: 'Ocean',
            size: '50m²',
            image_url: 'images/rooms/suite1.svg'
        }, {
            room_id: 6,
            room_number: '302',
            category_name: 'Luxury Suite',
            category_id: 3,
            price: 219,
            description: 'Corner luxury suite with ocean view and balcony',
            num_beds: 1,
            view_type: 'Ocean',
            size: '55m²',
            image_url: 'images/rooms/suite1.svg'
        });
    }
    
    return mockRooms;
}

// Contact form handling
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const message = document.getElementById('contactMessage').value;
        
        // Normally you would send this to the server
        // But for now, just show a success message
        contactForm.innerHTML = `
            <div class="alert alert-success">
                <h5>Thank you for your message, ${name}!</h5>
                <p>We've received your inquiry and will contact you at ${email} shortly.</p>
            </div>
        `;
    });
}

// Function to load room categories from the API
function loadRoomCategories() {
    // Implementation of loadRoomCategories function
}

// Function to load room categories from the API
async function loadRoomCategories() {
    const roomCategorySelect = document.getElementById('roomCategory');
    if (!roomCategorySelect) return;
    
    try {
        // Try to fetch categories from API
        const response = await fetch('http://localhost:8000/api/categories');
        
        if (response.ok) {
            const categories = await response.json();
            
            // Keep the "All Categories" option
            let options = '<option value="all">All Categories</option>';
            
            // Add options from API
            categories.forEach(category => {
                options += `<option value="${category.id}">${category.name}</option>`;
            });
            
            roomCategorySelect.innerHTML = options;
        } else {
            console.warn('Failed to load categories from API, using default options');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        // The default options from HTML will remain if API call fails
    }
} 