// ========================================
// FoundIt - School Lost & Found
// Frontend JavaScript
// ========================================

// State
let currentPage = 'home';
let currentCategory = 'all';
let searchQuery = '';
let items = [];

// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('[data-page]');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const reportForm = document.getElementById('report-form');
const claimForm = document.getElementById('claim-form');
const itemModal = document.getElementById('item-modal');
const claimModal = document.getElementById('claim-modal');
const toastContainer = document.getElementById('toast-container');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPhotoUpload();
    initForms();
    initModals();
    initSearch();
    loadRecentItems();
    setDefaultDate();
});

// ========================================
// Navigation
// ========================================

function initNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });

    mobileMenuBtn?.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
        mobileMenuBtn.classList.toggle('open');
    });

    // Close mobile menu when clicking a link
    mobileMenu?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            mobileMenuBtn.classList.remove('open');
        });
    });
}

function navigateTo(page) {
    currentPage = page;
    
    // Update active states
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(page)?.classList.add('active');
    
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Load data for specific pages
    if (page === 'browse') {
        loadItems();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Close mobile menu
    mobileMenu?.classList.remove('open');
}

// ========================================
// Items Loading
// ========================================

async function loadItems() {
    const grid = document.getElementById('browse-items-grid');
    const loading = document.getElementById('loading-items');
    const empty = document.getElementById('no-items-found');

    loading.style.display = 'block';
    grid.innerHTML = '';
    empty.style.display = 'none';

    try {
        const params = new URLSearchParams();
        if (currentCategory !== 'all') params.append('category', currentCategory);
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/items?${params}`);
        items = await response.json();

        loading.style.display = 'none';

        if (items.length === 0) {
            empty.style.display = 'block';
        } else {
            renderItems(grid, items);
        }
    } catch (error) {
        loading.style.display = 'none';
        showToast('Failed to load items', 'error');
    }
}

async function loadRecentItems() {
    const grid = document.getElementById('recent-items-grid');
    const empty = document.getElementById('no-recent-items');

    try {
        const response = await fetch('/api/items');
        const items = await response.json();
        const recentItems = items.slice(0, 4);

        if (recentItems.length === 0) {
            empty.style.display = 'block';
        } else {
            renderItems(grid, recentItems);
        }
    } catch (error) {
        console.error('Failed to load recent items:', error);
    }
}

function renderItems(container, items) {
    container.innerHTML = items.map(item => `
        <article class="item-card" data-id="${item.id}">
            <div class="item-image">
                ${item.photo 
                    ? `<img src="${item.photo}" alt="${escapeHtml(item.title)}" loading="lazy">`
                    : `<span class="placeholder-icon">${getCategoryIcon(item.category)}</span>`
                }
            </div>
            <div class="item-content">
                <span class="item-category">${escapeHtml(item.category)}</span>
                <h3 class="item-title">${escapeHtml(item.title)}</h3>
                <div class="item-meta">
                    <span>📍 ${escapeHtml(item.location)}</span>
                    <span>📅 ${formatDate(item.date_found)}</span>
                </div>
            </div>
        </article>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => openItemModal(card.dataset.id));
    });
}

function getCategoryIcon(category) {
    const icons = {
        electronics: '📱',
        clothing: '👕',
        accessories: '👜',
        books: '📚',
        sports: '⚽',
        other: '📦'
    };
    return icons[category] || '📦';
}

// ========================================
// Search & Filters
// ========================================

function initSearch() {
    // Search input with debounce
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            loadItems();
        }, 300);
    });

    // Category filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            loadItems();
        });
    });
}

// ========================================
// Photo Upload
// ========================================

function initPhotoUpload() {
    const photoInput = document.getElementById('item-photo');
    const placeholder = document.getElementById('upload-placeholder');
    const preview = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');
    const removeBtn = document.getElementById('remove-photo');

    photoInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('File size must be less than 5MB', 'error');
                photoInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                placeholder.style.display = 'none';
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        photoInput.value = '';
        previewImage.src = '';
        preview.style.display = 'none';
        placeholder.style.display = 'block';
    });

    // Drag and drop
    const uploadArea = document.getElementById('photo-upload');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--color-primary)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                photoInput.files = dataTransfer.files;
                photoInput.dispatchEvent(new Event('change'));
            }
        });
    }
}

// ========================================
// Forms
// ========================================

function initForms() {
    // Report form
    reportForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(reportForm);
        const submitBtn = reportForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Submitting...</span>';

        try {
            const response = await fetch('/api/items', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showToast(result.message, 'success');
                reportForm.reset();
                document.getElementById('upload-preview').style.display = 'none';
                document.getElementById('upload-placeholder').style.display = 'block';
                setDefaultDate();
            } else {
                showToast(result.error || 'Failed to submit item', 'error');
            }
        } catch (error) {
            showToast('Failed to submit item', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Claim form
    claimForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(claimForm);
        const data = Object.fromEntries(formData);
        const submitBtn = claimForm.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await fetch('/api/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                showToast(result.message, 'success');
                closeClaimModal();
                claimForm.reset();
            } else {
                showToast(result.error || 'Failed to submit claim', 'error');
            }
        } catch (error) {
            showToast('Failed to submit claim', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Claim';
        }
    });
}

function setDefaultDate() {
    const dateInput = document.getElementById('item-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// ========================================
// Modals
// ========================================

function initModals() {
    // Item modal
    document.getElementById('modal-close')?.addEventListener('click', closeItemModal);
    document.querySelector('#item-modal .modal-backdrop')?.addEventListener('click', closeItemModal);

    // Claim modal
    document.getElementById('claim-modal-close')?.addEventListener('click', closeClaimModal);
    document.getElementById('cancel-claim')?.addEventListener('click', closeClaimModal);
    document.querySelector('#claim-modal .modal-backdrop')?.addEventListener('click', closeClaimModal);

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeItemModal();
            closeClaimModal();
        }
    });
}

async function openItemModal(itemId) {
    const modal = document.getElementById('item-modal');
    const body = document.getElementById('modal-body');

    try {
        const response = await fetch(`/api/items/${itemId}`);
        const item = await response.json();

        if (response.ok) {
            body.innerHTML = `
                <div class="item-detail">
                    <div class="item-detail-image">
                        ${item.photo 
                            ? `<img src="${item.photo}" alt="${escapeHtml(item.title)}">`
                            : `<span class="placeholder-icon">${getCategoryIcon(item.category)}</span>`
                        }
                    </div>
                    <div class="item-detail-header">
                        <div>
                            <span class="item-category">${escapeHtml(item.category)}</span>
                            <h2 class="item-detail-title">${escapeHtml(item.title)}</h2>
                        </div>
                    </div>
                    <div class="item-detail-info">
                        <div class="info-row">
                            <span class="info-label">📍 Location:</span>
                            <span class="info-value">${escapeHtml(item.location)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📅 Date Found:</span>
                            <span class="info-value">${formatDate(item.date_found)}</span>
                        </div>
                        ${item.description ? `
                            <div class="info-row">
                                <span class="info-label">📝 Description:</span>
                                <span class="info-value">${escapeHtml(item.description)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="item-detail-actions">
                        <button class="btn btn-primary btn-large" onclick="openClaimModal('${item.id}', '${escapeHtml(item.title).replace(/'/g, "\\'")}')">
                            <span>Claim This Item</span>
                        </button>
                        <button class="btn btn-secondary" onclick="closeItemModal()">Close</button>
                    </div>
                </div>
            `;
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        showToast('Failed to load item details', 'error');
    }
}

function closeItemModal() {
    document.getElementById('item-modal').classList.remove('open');
    document.body.style.overflow = '';
}

function openClaimModal(itemId, itemTitle) {
    closeItemModal();
    document.getElementById('claim-item-id').value = itemId;
    document.getElementById('claim-item-name').textContent = itemTitle;
    document.getElementById('claim-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeClaimModal() {
    document.getElementById('claim-modal').classList.remove('open');
    document.body.style.overflow = '';
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close">×</button>
    `;

    toastContainer.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toast);
    });

    setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast) {
    toast.style.animation = 'toastSlideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
}

// ========================================
// Utility Functions
// ========================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Make functions available globally for inline handlers
window.openClaimModal = openClaimModal;
window.closeItemModal = closeItemModal;

