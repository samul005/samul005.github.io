class RegistrationHandler {
    constructor() {
        this.timestamp = "2025-02-02 04:37:57";
        this.currentUser = "samul005";
        
        this.setupEventListeners();
        this.setupPasswordStrengthMeter();
    }

    setupEventListeners() {
        // Username availability check
        const usernameInput = document.getElementById('registerUsername');
        if (usernameInput) {
            usernameInput.addEventListener('input', 
                debounce((e) => this.checkUsernameAvailability(e.target.value), 500));
        }

        // Password strength checker
        const passwordInput = document.getElementById('registerPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', 
                (e) => this.updatePasswordStrength(e.target.value));
        }

        // Password confirmation
        const confirmInput = document.getElementById('confirmPassword');
        if (confirmInput) {
            confirmInput.addEventListener('input', 
                () => this.checkPasswordMatch());
        }

        // Password visibility toggle
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', (e) => {
                const input = e.target.closest('.input-group')
                    .querySelector('input');
                const icon = e.target.closest('.toggle-password')
                    .querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });
    }

    setupPasswordStrengthMeter() {
        this.strengthRequirements = {
            length: str => str.length >= 8,
            letter: str => /[A-Za-z]/.test(str),
            number: str => /\d/.test(str)
        };
    }

    async checkUsernameAvailability(username) {
        if (username.length < 3) return;

        const availabilityIndicator = document.querySelector('.username-availability');
        
        try {
            const response = await fetch(`/api/check-username?username=${username}`);
            const data = await response.json();
            
            if (data.available) {
                availabilityIndicator.innerHTML = 
                    '<i class="fas fa-check" style="color: var(--success-color);"></i>';
                availabilityIndicator.setAttribute('data-available', 'true');
            } else {
                availabilityIndicator.innerHTML = 
                    '<i class="fas fa-times" style="color: var(--danger-color);"></i>';
                availabilityIndicator.setAttribute('data-available', 'false');
            }
        } catch (error) {
            console.error('Error checking username:', error);
        }
    }

    updatePasswordStrength(password) {
        const strengthMeter = document.querySelector('.strength-meter');
        const requirements = document.querySelectorAll('.strength-requirements li');
        
        // Check each requirement
        let validCount = 0;
        requirements.forEach(requirement => {
            const type = requirement.dataset.requirement;
            const isValid = this.strengthRequirements[type](password);
            
            requirement.classList.toggle('valid', isValid);
            if (isValid) validCount++;
        });

        // Update strength meter
        let strength = '';
        if (validCount === 0) {
            strength = '';
        } else if (validCount < 2) {
            strength = 'weak';
        } else if (validCount < 3) {
            strength = 'medium';
        } else {
            strength = 'strong';
        }

        strengthMeter.setAttribute('data-strength', strength);
    }

    checkPasswordMatch() {
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');
        
        if (confirm) {
            if (password === confirm) {
                confirmInput.setCustomValidity('');
                confirmInput.style.borderColor = 'var(--success-color)';
            } else {
                confirmInput.setCustomValidity('Passwords do not match');
                confirmInput.style.borderColor = 'var(--danger-color)';
            }
        }
    }

    validateForm() {
        // Check username availability
        const usernameAvailable = document.querySelector('.username-availability')
            ?.getAttribute('data-available') === 'true';
        if (!usernameAvailable) {
            this.showError('Username is not available');
            return false;
        }

        // Check password strength
        const strengthMeter = document.querySelector('.strength-meter');
        const strength = strengthMeter.getAttribute('data-strength');
        if (!strength || strength === 'weak') {
            this.showError('Password is too weak');
            return false;
        }

        // Check terms agreement
        const termsAgreed = document.getElementById('agreeTerms').checked;
        if (!termsAgreed) {
            this.showError('Please agree to the Terms of Service and Privacy Policy');
            return false;
        }

        return true;
    }

    showError(message) {
        const errorElement = document.getElementById('authError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    async registerWithSocialProvider(provider) {
        try {
            let authProvider;
            switch (provider) {
                case 'google':
                    authProvider = new firebase.auth.GoogleAuthProvider();
                    break;
                case 'github':
                    authProvider = new firebase.auth.GithubAuthProvider();
                    break;
                default:
                    throw new Error('Unsupported provider');
            }

            const result = await firebase.auth().signInWithPopup(authProvider);
            
            // Create user profile if it's a new user
            if (result.additionalUserInfo.isNewUser) {
                await this.createSocialUserProfile(result.user);
            }

            // Redirect to onboarding or home
            window.location.href = result.additionalUserInfo.isNewUser ? 
                'onboarding.html' : 'index.html';
        } catch (error) {
            console.error('Social auth error:', error);
            this.showError('Social authentication failed. Please try again.');
        }
    }

    async createSocialUserProfile(user) {
        const userProfile = {
            uid: user.uid,
            email: user.email,
            username: this.generateUsername(user.displayName),
            created: this.timestamp,
            lastActive: this.timestamp,
            profileComplete: false,
            level: 1,
            experience: 0,
            coins: 100,
            inventory: {},
            settings: {
                sound: true,
                music: true,
                theme: 'light',
                language: 'en'
            },
            statistics: {
                gamesPlayed: 0,
                gamesWon: 0,
                totalScore: 0,
                bestScore: 0,
                timePlayed: 0
            },
            socialProvider: {
                name: user.providerData[0].providerId,
                avatar: user.photoURL
            }
        };

        await this.dbManager.createUser(userProfile);
    }

    generateUsername(displayName) {
        // Convert display name to lowercase and remove spaces
        let baseUsername = displayName.toLowerCase().replace(/\s+/g, '');
        
        // Add random numbers if needed
        const random = Math.floor(Math.random() * 1000);
        return `${baseUsername}${random}`;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize registration handler when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const registration = new RegistrationHandler();
    
    // Setup social login buttons
    document.querySelector('.social-btn.google')?.addEventListener('click', 
        () => registration.registerWithSocialProvider('google'));
    document.querySelector('.social-btn.github')?.addEventListener('click', 
        () => registration.registerWithSocialProvider('github'));
});
