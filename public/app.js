// ========================================
// FoundIt - School Lost & Found
// Frontend JavaScript
// ========================================

// State
let currentPage = 'home';
let currentCategory = 'all';
let searchQuery = '';
let sortBy = 'newest';
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
    initSorting();
    initDarkMode();
    initLostItemForm();
    initFeaturesShowcase();
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
    } else if (page === 'stats') {
        loadStats();
    } else if (page === 'lost') {
        setDefaultDate('lost-item-date');
    } else if (page === 'mission') {
        // Mission page doesn't need data loading
        initMissionButtons();
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

    if (loading) loading.style.display = 'block';
    if (grid) grid.innerHTML = '';
    if (empty) empty.style.display = 'none';

    try {
        const params = new URLSearchParams();
        if (currentCategory !== 'all') params.append('category', currentCategory);
        if (searchQuery) params.append('search', searchQuery);
        if (sortBy) params.append('sort', sortBy);

        const response = await fetch(`/api/items?${params}`);
        items = await response.json();

        if (loading) loading.style.display = 'none';

        if (items.length === 0) {
            if (empty) empty.style.display = 'block';
        } else {
            if (grid) renderItems(grid, items);
        }
    } catch (error) {
        if (loading) loading.style.display = 'none';
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
        electronics: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
        clothing: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l1.2 7a2 2 0 0 0 2 1.67h12.24a2 2 0 0 0 2-1.67l1.2-7a2 2 0 0 0-1.34-2.23z"/><path d="M12 9v13"/><path d="M8 9h8"/></svg>',
        accessories: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        books: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
        sports: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        other: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
    };
    return icons[category] || icons.other;
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

            if (!response.ok) {
                const result = await response.json().catch(() => ({ error: `Server error: ${response.status} ${response.statusText}` }));
                showToast(result.error || `Failed to submit item (${response.status})`, 'error');
                console.error('Server response:', result);
                return;
            }

            const result = await response.json();
            showToast(result.message, 'success');
            reportForm.reset();
            const preview = document.getElementById('upload-preview');
            const placeholder = document.getElementById('upload-placeholder');
            if (preview) preview.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
            setDefaultDate();
        } catch (error) {
            console.error('Form submission error:', error);
            showToast(`Failed to submit item: ${error.message || 'Network error. Is the server running?'}`, 'error');
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

function setDefaultDate(inputId = 'item-date') {
    const dateInput = document.getElementById(inputId);
    if (dateInput && !dateInput.value) {
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

// ========================================
// Sorting
// ========================================

function initSorting() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            loadItems();
        });
    }
}

// ========================================
// Dark Mode
// ========================================

function initDarkMode() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon && moonIcon) {
        sunIcon.style.display = theme === 'dark' ? 'none' : 'block';
        moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
    }
}

// ========================================
// Lost Item Form
// ========================================

function initLostItemForm() {
    const lostForm = document.getElementById('lost-form');
    if (lostForm) {
        lostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(lostForm);
            const data = Object.fromEntries(formData);

            try {
                const response = await fetch('/api/lost-items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if (response.ok) {
                    showToast('Lost item reported successfully! We will contact you if it\'s found.', 'success');
                    lostForm.reset();
                } else {
                    showToast(result.error || 'Failed to submit report', 'error');
                }
            } catch (error) {
                showToast('Failed to submit report. Please try again.', 'error');
            }
        });
    }
}

// ========================================
// Statistics
// ========================================

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        // Update stat cards
        const totalEl = document.getElementById('stat-total-found');
        const claimedEl = document.getElementById('stat-claimed');
        const rateEl = document.getElementById('stat-success-rate');
        const monthEl = document.getElementById('stat-this-month');
        
        if (totalEl) totalEl.textContent = stats.totalFoundItems || 0;
        if (claimedEl) claimedEl.textContent = stats.claimedItems || 0;
        if (rateEl) rateEl.textContent = `${stats.successRate || 0}%`;
        if (monthEl) monthEl.textContent = stats.itemsThisMonth || 0;

        // Create category chart
        const ctx = document.getElementById('category-chart');
        if (ctx && typeof Chart !== 'undefined') {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stats.categoryCounts || {}),
                    datasets: [{
                        data: Object.values(stats.categoryCounts || {}),
                        backgroundColor: [
                            '#1e40af',
                            '#3b82f6',
                            '#f59e0b',
                            '#10b981',
                            '#ef4444',
                            '#8b5cf6'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// ========================================
// Mission Page Buttons
// ========================================

function initMissionButtons() {
    // Mission page buttons are handled by navigation system via data-page attribute
    // This function is called when mission page is loaded
    const missionButtons = document.querySelectorAll('#mission button[data-page]');
    missionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = btn.getAttribute('data-page');
            if (page) {
                navigateTo(page);
            }
        });
    });
}

// ========================================
// Feature Showcase (Grid Layout)
// ========================================

function initFeaturesShowcase() {
    // Features are now displayed in a grid, no scroll interaction needed
    const showcase = document.querySelector('.features-showcase');
    if (!showcase) return;
    
    // Add hover animations to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}

// Make functions available globally for inline handlers
window.openClaimModal = openClaimModal;
window.closeItemModal = closeItemModal;

