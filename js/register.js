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
        if (username.length <
