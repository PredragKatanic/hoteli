document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form values
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate passwords match
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            // Validate password strength
            if (password.length < 8) {
                alert('Password must be at least 8 characters long');
                return;
            }

            // Create user object
            const userData = {
                username: username,
                email: email,
                password: password,
                full_name: `${firstName} ${lastName}`,
                phone: phone,
                role: 'guest'
            };

            try {
                const response = await fetch('http://localhost:8000/api/users/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData)
                });

                if (response.ok) {
                    alert('Registration successful! Please login.');
                    window.location.href = 'login.html';
                } else {
                    const errorData = await response.json();
                    alert(errorData.detail || 'Registration failed. Please try again.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            }
        });
    }

    // Password strength indicator
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (passwordInput && confirmPasswordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);
            updatePasswordStrengthIndicator(strength);
        });

        confirmPasswordInput.addEventListener('input', function() {
            const password = document.getElementById('password').value;
            const confirmPassword = this.value;
            
            if (password === confirmPassword) {
                this.setCustomValidity('');
            } else {
                this.setCustomValidity('Passwords do not match');
            }
        });
    }
});

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    
    // Contains number
    if (/\d/.test(password)) strength++;
    
    // Contains lowercase letter
    if (/[a-z]/.test(password)) strength++;
    
    // Contains uppercase letter
    if (/[A-Z]/.test(password)) strength++;
    
    // Contains special character
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
}

// Update password strength indicator
function updatePasswordStrengthIndicator(strength) {
    const strengthText = document.createElement('div');
    strengthText.className = 'password-strength mt-1';
    
    let strengthMessage = '';
    let strengthClass = '';
    
    switch(strength) {
        case 0:
        case 1:
            strengthMessage = 'Very Weak';
            strengthClass = 'text-danger';
            break;
        case 2:
            strengthMessage = 'Weak';
            strengthClass = 'text-warning';
            break;
        case 3:
            strengthMessage = 'Medium';
            strengthClass = 'text-info';
            break;
        case 4:
            strengthMessage = 'Strong';
            strengthClass = 'text-success';
            break;
        case 5:
            strengthMessage = 'Very Strong';
            strengthClass = 'text-success';
            break;
    }
    
    strengthText.innerHTML = `<small class="${strengthClass}">Password Strength: ${strengthMessage}</small>`;
    
    const existingIndicator = document.querySelector('.password-strength');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    document.getElementById('password').parentNode.appendChild(strengthText);
} 