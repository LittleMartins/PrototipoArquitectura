export class ModalSystem {
    constructor() {
        this.modals = new Map();
        this.setupStyles();
    }

    createModal(id, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = id;

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${options.title || ''}</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${options.content || ''}
                </div>
                ${options.footer ? `
                    <div class="modal-footer">
                        ${options.footer}
                    </div>
                ` : ''}
            </div>
        `;

        this.setupModalEvents(modal);
        document.body.appendChild(modal);
        this.modals.set(id, modal);
        
        return modal;
    }

    show(id, options = {}) {
        let modal = this.modals.get(id);
        
        if (!modal) {
            modal = this.createModal(id, options);
        } else if (options.content) {
            modal.querySelector('.modal-body').innerHTML = options.content;
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hide(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    setupModalEvents(modal) {
        const closeBtn = modal.querySelector('.modal-close');
        const backdrop = modal.querySelector('.modal-backdrop');

        closeBtn?.addEventListener('click', () => {
            this.hide(modal.id);
        });

        backdrop?.addEventListener('click', () => {
            this.hide(modal.id);
        });

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                this.hide(modal.id);
            }
        });
    }

    setupStyles() {
        const styles = `
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
            }

            .modal.show {
                display: block;
            }

            .modal-backdrop {
                position: absolute;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            }

            .modal-container {
                position: relative;
                width: 90%;
                max-width: 500px;
                margin: 50px auto;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }

            .modal-header {
                padding: 15px 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-body {
                padding: 20px;
                max-height: 70vh;
                overflow-y: auto;
            }

            .modal-footer {
                padding: 15px 20px;
                border-top: 1px solid #eee;
                text-align: right;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 1.5em;
                cursor: pointer;
                color: #666;
            }

            .modal-close:hover {
                color: #000;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
} 