class PasswordResetHandler {
    constructor() {
        this.timestamp = "2025-02-02 04:46:06";
        this.currentUser = "samul005";
        this.auth = window.auth;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('resetPasswordForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleResetRequest(e));
        }
    }

    async handleResetRequest(e) {
        e.preventDefault();
        
        const email = document.getElementById('resetEmail').value;
        const submitButton = e.target.querySelector('button');
        
        try {
            // Disable button and show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            // Send password reset email
            await this.auth.sendPasswordResetEmail(email, {
                url: `${window.location.origin}/login.html`,
                handleCodeInApp: true
            });
            
            // Show success message
            this.showMessage('success', 
                'Password reset link has been sent to your email address.');
            
            // Log the reset request
            await this.logResetRequest(email);
        } catch (error) {
            // Handle specific error cases
            let errorMessage;
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many attempts. Please try again later.';
                    break;
                default:
                    errorMessage = 'An error occurred. Please try again.';
            }
            this.showMessage('error', errorMessage);
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        }
    }

    async logResetRequest(email) {
        try {
            const logData = {
                email: email,
                timestamp: this.timestamp,
                ipAddress: await this.getClientIP(),
                userAgent: navigator.userAgent
            };

            // Send log to server
            await fetch('/api/log-reset-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });
        } catch (error) {
            console.error('Error logging reset request:', error);
        }
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    showMessage(type, message) {
        const errorElement = document.getElementById('authError');
        const successElement = document.getElementById('authSuccess');
        
        // Hide both elements initially
        errorElement.style.display = 'none';
        successElement.style.display = 'none';
        
        // Show appropriate message
        if (type === 'error') {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            successElement.textContent = message;
            successElement.style.display = 'block';
        }

        // Auto-hide message after 5 seconds
        setTimeout(() => {
            if (type === 'error') {
                errorElement.style.display = 'none';
            } else {
                successElement.style.display = 'none';
            }
        }, 5000);
    }
}

// Initialize password reset handler when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new PasswordResetHandler();
});
