export class PurchaseModal {
    constructor(onConfirm) {
        this.onConfirm = onConfirm;
        this.modal = null;
        this.createModal();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal purchase-modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="item-preview"></div>
                <div class="purchase-info">
                    <div class="price"></div>
                    <div class="balance"></div>
                </div>
                <div class="modal-buttons">
                    <button class="confirm-btn">Confirm</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
        this.setupListeners();
    }

    setupListeners() {
        this.modal.querySelector('.confirm-btn').addEventListener('click', () => {
            this.onConfirm();
            this.hide();
        });
        this.modal.querySelector('.cancel-btn').addEventListener('click', () => this.hide());
    }

    show(item, userBalance) {
        this.modal.querySelector('.item-preview').innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
        `;
        this.modal.querySelector('.price').textContent = `Cost: ${item.price}🌀`;
        this.modal.querySelector('.balance').textContent = `Balance after: ${userBalance - item.price}🌀`;
        this.modal.classList.add('active');
    }

    hide() {
        this.modal.classList.remove('active');
    }
}
