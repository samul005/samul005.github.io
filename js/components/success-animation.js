
export class SuccessAnimation {
    constructor() {
        this.element = null;
        this.createAnimation();
    }

    createAnimation() {
        this.element = document.createElement('div');
        this.element.className = 'success-animation';
        document.body.appendChild(this.element);
    }

    show(message = 'Purchase Successful!', duration = 2000) {
        this.element.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <p>${message}</p>
            </div>
        `;
        this.element.classList.add('active');
        setTimeout(() => this.hide(), duration);
    }

    hide() {
        this.element.classList.remove('active');
    }
}