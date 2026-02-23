// ========================================
// FoundIt - Admin Panel JavaScript
// ========================================

// State
let isLoggedIn = false;
let currentSection = 'dashboard';
let currentItemsFilter = 'all';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.admin-section');
const tabBtns = document.querySelectorAll('.tab-btn');
const toastContainer = document.getElementById('toast-container');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    initLogin();
    initItemsTable();
    initModals();
});

// ========================================
// Authentication
// ========================================

function checkAuth() {
    const auth = localStorage.getItem('foundit_admin');
    if (auth) {
        isLoggedIn = true;
        showDashboard();
    }
}

function initLogin() {
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (result.success) {
                localStorage.setItem('foundit_admin', 'true');
                isLoggedIn = true;
                showDashboard();
                showToast('Welcome back!', 'success');
            } else {
                showToast('Invalid credentials', 'error');
            }
        } catch (error) {
            showToast('Login failed', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('foundit_admin');
        isLoggedIn = false;
        loginScreen.style.display = 'flex';
        adminDashboard.style.display = 'none';
        loginForm.reset();
    });
}

function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'flex';
    loadDashboardData();
}

// ========================================
// Navigation
// ========================================

function initNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });

    // View all links
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateToSection(section);
        });
    });
}

function navigateToSection(section) {
    currentSection = section;
    
    // Update nav active states
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    
    // Show section
    sections.forEach(s => {
        s.classList.toggle('active', s.id === `section-${section}`);
    });
    
    // Load data for section
    if (section === 'items') {
        loadItems();
    } else if (section === 'claims') {
        loadClaims();
    } else if (section === 'dashboard') {
        loadDashboardData();
    } else if (section === 'lost-items') {
        loadLostItems();
    }
}

// ========================================
// Dashboard Data
// ========================================

async function loadDashboardData() {
    try {
        // Load stats
        const statsResponse = await fetch('/api/admin/stats');
        const stats = await statsResponse.json();
        
        document.getElementById('stat-total').textContent = stats.totalItems;
        document.getElementById('stat-pending').textContent = stats.pendingItems;
        document.getElementById('stat-approved').textContent = stats.approvedItems;
        document.getElementById('stat-claims').textContent = stats.pendingClaims;
        
        // Update badges
        document.getElementById('pending-items-badge').textContent = stats.pendingItems;
        document.getElementById('pending-claims-badge').textContent = stats.pendingClaims;
        const lostItemsBadge = document.getElementById('active-lost-items-badge');
        if (lostItemsBadge) {
            lostItemsBadge.textContent = stats.activeLostItems || 0;
        }
        
        // Load recent submissions first (needed for timeline chart)
        const itemsResponse = await fetch('/api/admin/items');
        const items = await itemsResponse.json();
        renderRecentSubmissions(items.slice(0, 5));
        
        // Render charts after a small delay to ensure Chart.js is loaded
        setTimeout(() => {
            renderCategoryChart(stats.categoryCounts || {});
            renderTimelineChart(items);
        }, 100);
        
        // Load recent claims
        const claimsResponse = await fetch('/api/admin/claims');
        const claims = await claimsResponse.json();
        renderRecentClaims(claims.slice(0, 5));
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function renderCategoryChart(categoryCounts) {
    const ctx = document.getElementById('admin-category-chart');
    if (!ctx) {
        console.error('Category chart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        ctx.parentElement.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Chart library not loaded</p>';
        return;
    }
    
    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);
    
    // Handle empty data
    if (labels.length === 0 || data.every(v => v === 0)) {
        ctx.parentElement.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No items found yet</p>';
        return;
    }
    
    // Destroy existing chart if it exists
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    try {
        ctx.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
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
    } catch (error) {
        console.error('Error rendering category chart:', error);
        ctx.parentElement.innerHTML = '<p style="text-align: center; color: var(--color-error);">Error loading chart</p>';
    }
}

function renderTimelineChart(items) {
    const ctx = document.getElementById('admin-timeline-chart');
    if (!ctx) {
        console.error('Timeline chart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        ctx.parentElement.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Chart library not loaded</p>';
        return;
    }
    
    if (!items || items.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No items found yet</p>';
        return;
    }
    
    // Group items by date
    const dateMap = {};
    items.forEach(item => {
        if (item.created_at) {
            const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dateMap[date] = (dateMap[date] || 0) + 1;
        }
    });
    
    // Get last 7 days
    const dates = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dates.push(dateStr);
        counts.push(dateMap[dateStr] || 0);
    }
    
    // Destroy existing chart if it exists
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    try {
        ctx.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Items Found',
                    data: counts,
                    borderColor: '#1e40af',
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering timeline chart:', error);
        ctx.parentElement.innerHTML = '<p style="text-align: center; color: var(--color-error);">Error loading chart</p>';
    }
}

function renderRecentSubmissions(items) {
    const container = document.getElementById('recent-submissions');
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 1rem;">
                <p>No submissions yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="recent-list">
            ${items.map(item => `
                <div class="recent-item" onclick="openItemDetail('${item.id}')">
                    ${item.photo 
                        ? `<img src="${item.photo}" class="recent-item-photo" alt="">`
                        : `<div class="recent-item-photo-placeholder">${getCategoryIcon(item.category)}</div>`
                    }
                    <div class="recent-item-info">
                        <span class="recent-item-title">${escapeHtml(item.title)}</span>
                        <span class="recent-item-meta">${formatDate(item.created_at)}</span>
                    </div>
                    <span class="status-badge ${item.status}">${item.status}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderRecentClaims(claims) {
    const container = document.getElementById('recent-claims');
    
    if (claims.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 1rem;">
                <p>No claims yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="recent-list">
            ${claims.map(claim => `
                <div class="recent-item" onclick="navigateToSection('claims')">
                    <div class="recent-item-photo-placeholder">📋</div>
                    <div class="recent-item-info">
                        <span class="recent-item-title">${escapeHtml(claim.claimant_name)}</span>
                        <span class="recent-item-meta">${escapeHtml(claim.item_title || 'Unknown item')}</span>
                    </div>
                    <span class="status-badge ${claim.status}">${claim.status}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// ========================================
// Items Management
// ========================================

function initItemsTable() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentItemsFilter = btn.dataset.status;
            loadItems();
        });
    });
}

async function loadItems() {
    const tbody = document.getElementById('items-table-body');
    const emptyState = document.getElementById('no-items');
    
    try {
        const response = await fetch(`/api/admin/items?status=${currentItemsFilter}`);
        const items = await response.json();
        
        if (items.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            document.getElementById('items-table').style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            document.getElementById('items-table').style.display = 'table';
            renderItemsTable(items);
        }
    } catch (error) {
        showToast('Failed to load items', 'error');
    }
}

function renderItemsTable(items) {
    const tbody = document.getElementById('items-table-body');
    
    tbody.innerHTML = items.map(item => `
        <tr>
            <td>
                ${item.photo 
                    ? `<img src="${item.photo}" class="table-photo" alt="">`
                    : `<div class="table-photo-placeholder">${getCategoryIcon(item.category)}</div>`
                }
            </td>
            <td>
                <span class="table-item-title">${escapeHtml(item.title)}</span>
                <span class="table-item-date">${formatDate(item.date_found)}</span>
            </td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.location)}</td>
            <td>${escapeHtml(item.finder_name)}</td>
            <td><span class="status-badge ${item.status}">${item.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" onclick="openItemDetail('${item.id}')" title="View Details">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    ${item.status === 'pending' ? `
                        <button class="action-btn approve" onclick="updateItemStatus('${item.id}', 'approved')" title="Approve">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </button>
                        <button class="action-btn reject" onclick="updateItemStatus('${item.id}', 'rejected')" title="Reject">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    ` : ''}
                    <button class="action-btn delete" onclick="deleteItem('${item.id}')" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function updateItemStatus(id, status) {
    try {
        const adminName = localStorage.getItem('admin_name') || 'Admin';
        const response = await fetch(`/api/admin/items/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, admin_name: adminName })
        });

        if (response.ok) {
            showToast(`Item ${status}`, 'success');
            loadItems();
            loadDashboardData();
        } else {
            showToast('Failed to update item', 'error');
        }
    } catch (error) {
        showToast('Failed to update item', 'error');
    }
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`/api/admin/items/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Item deleted', 'success');
            loadItems();
            loadDashboardData();
        } else {
            showToast('Failed to delete item', 'error');
        }
    } catch (error) {
        showToast('Failed to delete item', 'error');
    }
}

// ========================================
// Claims Management
// ========================================

async function loadClaims() {
    const container = document.getElementById('claims-list');
    const emptyState = document.getElementById('no-claims');
    
    try {
        const response = await fetch('/api/admin/claims');
        const claims = await response.json();
        
        if (claims.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            renderClaims(claims);
        }
    } catch (error) {
        showToast('Failed to load claims', 'error');
    }
}

function renderClaims(claims) {
    const container = document.getElementById('claims-list');
    
    container.innerHTML = claims.map(claim => `
        <div class="claim-card">
            <div class="claim-header">
                <div class="claim-item-info">
                    <h3>Claim for: ${escapeHtml(claim.item_title || 'Unknown Item')}</h3>
                    <p>Submitted ${formatDate(claim.created_at)}</p>
                </div>
                <span class="status-badge ${claim.status}">${claim.status}</span>
            </div>
            <div class="claim-details">
                <div class="claim-detail">
                    <span class="claim-detail-label">Claimant Name</span>
                    <span class="claim-detail-value">${escapeHtml(claim.claimant_name)}</span>
                </div>
                <div class="claim-detail">
                    <span class="claim-detail-label">Email</span>
                    <span class="claim-detail-value">${escapeHtml(claim.claimant_email)}</span>
                </div>
                <div class="claim-detail">
                    <span class="claim-detail-label">Phone</span>
                    <span class="claim-detail-value">${escapeHtml(claim.claimant_phone || 'Not provided')}</span>
                </div>
            </div>
            <div class="claim-description">
                <h4>Proof of Ownership</h4>
                <p>${escapeHtml(claim.description)}</p>
            </div>
            ${claim.status === 'pending' ? `
                <div class="claim-actions">
                    <button class="btn btn-secondary" onclick="updateClaimStatus('${claim.id}', 'rejected')">Reject Claim</button>
                    <button class="btn btn-primary" onclick="updateClaimStatus('${claim.id}', 'approved')">Approve Claim</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function updateClaimStatus(id, status) {
    try {
        const adminName = localStorage.getItem('admin_name') || 'Admin';
        const response = await fetch(`/api/admin/claims/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, admin_name: adminName })
        });

        if (response.ok) {
            showToast(`Claim ${status}`, 'success');
            loadClaims();
            loadDashboardData();
        } else {
            showToast('Failed to update claim', 'error');
        }
    } catch (error) {
        showToast('Failed to update claim', 'error');
    }
}

// ========================================
// Item Detail Modal
// ========================================

function initModals() {
    const modal = document.getElementById('item-detail-modal');
    const closeBtn = document.getElementById('item-detail-close');
    const backdrop = modal?.querySelector('.modal-backdrop');
    
    closeBtn?.addEventListener('click', closeItemDetail);
    backdrop?.addEventListener('click', closeItemDetail);
    
    // Match modal
    const matchModal = document.getElementById('match-item-modal');
    const matchCloseBtn = document.getElementById('match-modal-close');
    const matchBackdrop = matchModal?.querySelector('.modal-backdrop');
    
    matchCloseBtn?.addEventListener('click', closeMatchModal);
    matchBackdrop?.addEventListener('click', closeMatchModal);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeItemDetail();
            closeMatchModal();
        }
    });
}

function closeMatchModal() {
    const modal = document.getElementById('match-item-modal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

async function openItemDetail(id) {
    const modal = document.getElementById('item-detail-modal');
    const body = document.getElementById('item-detail-body');
    
    try {
        const response = await fetch(`/api/items/${id}`);
        const item = await response.json();
        
        body.innerHTML = `
            <div class="item-detail-admin">
                <div class="detail-grid">
                    <div class="detail-image">
                        ${item.photo 
                            ? `<img src="${item.photo}" alt="${escapeHtml(item.title)}">`
                            : `<span style="font-size: 4rem;">${getCategoryIcon(item.category)}</span>`
                        }
                    </div>
                    <div class="detail-info">
                        <span class="status-badge ${item.status}">${item.status}</span>
                        <h2>${escapeHtml(item.title)}</h2>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-item-label">Category</span>
                                <span class="info-item-value">${escapeHtml(item.category)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-item-label">Location Found</span>
                                <span class="info-item-value">${escapeHtml(item.location)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-item-label">Date Found</span>
                                <span class="info-item-value">${formatDate(item.date_found)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-item-label">Submitted</span>
                                <span class="info-item-value">${formatDate(item.created_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${item.description ? `
                    <div class="description-box">
                        <h3>Description</h3>
                        <p>${escapeHtml(item.description)}</p>
                    </div>
                ` : ''}
                
                <div class="description-box">
                    <h3>Found By</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item-label">Name</span>
                            <span class="info-item-value">${escapeHtml(item.finder_name)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item-label">Email</span>
                            <span class="info-item-value">${escapeHtml(item.finder_email)}</span>
                        </div>
                        ${item.finder_phone ? `
                            <div class="info-item">
                                <span class="info-item-label">Phone</span>
                                <span class="info-item-value">${escapeHtml(item.finder_phone)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${item.history && item.history.length > 0 ? `
                    <div class="description-box">
                        <h3>Item History</h3>
                        <div class="history-timeline">
                            ${item.history.map(entry => `
                                <div class="history-entry">
                                    <div class="history-icon">
                                        ${getHistoryIcon(entry.action)}
                                    </div>
                                    <div class="history-content">
                                        <div class="history-action">${escapeHtml(entry.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))}</div>
                                        <div class="history-details">${escapeHtml(entry.details || '')}</div>
                                        <div class="history-meta">
                                            <span>By: ${escapeHtml(entry.by || 'Unknown')}</span>
                                            <span>•</span>
                                            <span>${formatDateTime(entry.timestamp)}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeItemDetail()">Close</button>
                    ${item.status === 'pending' ? `
                        <button class="btn btn-outline" style="color: var(--color-error); border-color: var(--color-error);" onclick="updateItemStatus('${item.id}', 'rejected'); closeItemDetail();">Reject</button>
                        <button class="btn btn-primary" onclick="updateItemStatus('${item.id}', 'approved'); closeItemDetail();">Approve</button>
                    ` : ''}
                </div>
            </div>
        `;
        
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        showToast('Failed to load item details', 'error');
    }
}

function closeItemDetail() {
    const modal = document.getElementById('item-detail-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
}

// ========================================
// Lost Items Management
// ========================================

async function loadLostItems() {
    const container = document.getElementById('lost-items-list');
    const emptyState = document.getElementById('no-lost-items');
    
    try {
        const response = await fetch('/api/admin/lost-items');
        const lostItems = await response.json();
        
        if (!lostItems || lostItems.length === 0) {
            if (container) container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            renderLostItems(lostItems);
        }
    } catch (error) {
        console.error('Failed to load lost items:', error);
        showToast('Failed to load lost items', 'error');
    }
}

function renderLostItems(lostItems) {
    const container = document.getElementById('lost-items-list');
    if (!container) return;
    
    container.innerHTML = lostItems.map(lostItem => `
        <div class="claim-card">
            <div class="claim-header">
                <div>
                    <h3>${escapeHtml(lostItem.title)}</h3>
                    <span class="status-badge ${lostItem.status}">${lostItem.status}</span>
                </div>
                <span class="claim-date">${formatDate(lostItem.created_at)}</span>
            </div>
            <div class="claim-body">
                <div class="claim-info">
                    <div class="info-row">
                        <span class="info-label">Category:</span>
                        <span class="info-value">${escapeHtml(lostItem.category)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Location Lost:</span>
                        <span class="info-value">${escapeHtml(lostItem.location_lost)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date Lost:</span>
                        <span class="info-value">${formatDate(lostItem.date_lost)}</span>
                    </div>
                    ${lostItem.description ? `
                        <div class="info-row">
                            <span class="info-label">Description:</span>
                            <span class="info-value">${escapeHtml(lostItem.description)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="claim-contact">
                    <h4>Owner Information</h4>
                    <p><strong>Name:</strong> ${escapeHtml(lostItem.owner_name)}</p>
                    <p><strong>Email:</strong> ${escapeHtml(lostItem.owner_email)}</p>
                    ${lostItem.owner_phone ? `<p><strong>Phone:</strong> ${escapeHtml(lostItem.owner_phone)}</p>` : ''}
                </div>
            </div>
            <div class="claim-actions">
                ${lostItem.status === 'active' ? `
                    <button class="btn btn-primary" onclick="matchLostItem('${lostItem.id}')">Match with Found Item</button>
                ` : lostItem.matched_item_id ? `
                    <span class="matched-badge">Matched with item: ${lostItem.matched_item_id}</span>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function matchLostItem(lostItemId) {
    const modal = document.getElementById('match-item-modal');
    const lostItemInfo = document.getElementById('lost-item-info');
    const matchItemsList = document.getElementById('match-items-list');
    const noMatchItems = document.getElementById('no-match-items');
    const matchSearchInput = document.getElementById('match-search-input');
    
    // Load lost item details
    try {
        const lostItemsResponse = await fetch('/api/admin/lost-items');
        const lostItems = await lostItemsResponse.json();
        const lostItem = lostItems.find(item => item.id === lostItemId);
        
        if (!lostItem) {
            showToast('Lost item not found', 'error');
            return;
        }
        
        // Display lost item info
        lostItemInfo.innerHTML = `
            <div class="match-lost-item-card">
                <h3>Lost Item: ${escapeHtml(lostItem.title)}</h3>
                <div class="match-item-details">
                    <p><strong>Category:</strong> ${escapeHtml(lostItem.category)}</p>
                    <p><strong>Location Lost:</strong> ${escapeHtml(lostItem.location_lost)}</p>
                    <p><strong>Date Lost:</strong> ${formatDate(lostItem.date_lost)}</p>
                    ${lostItem.description ? `<p><strong>Description:</strong> ${escapeHtml(lostItem.description)}</p>` : ''}
                </div>
            </div>
        `;
        
        // Load found items
        const itemsResponse = await fetch('/api/admin/items?status=approved');
        const foundItems = await itemsResponse.json();
        
        // Filter out already claimed items and show only approved items
        const availableItems = foundItems.filter(item => item.status === 'approved' || item.status === 'pending');
        
        if (availableItems.length === 0) {
            matchItemsList.innerHTML = '';
            noMatchItems.style.display = 'block';
        } else {
            noMatchItems.style.display = 'none';
            renderMatchItems(availableItems, lostItemId, lostItem);
        }
        
        // Setup search
        let searchTimeout;
        matchSearchInput.value = '';
        matchSearchInput.oninput = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = availableItems.filter(item => 
                    item.title.toLowerCase().includes(searchTerm) ||
                    item.category.toLowerCase().includes(searchTerm) ||
                    (item.description && item.description.toLowerCase().includes(searchTerm)) ||
                    item.location.toLowerCase().includes(searchTerm)
                );
                renderMatchItems(filtered, lostItemId, lostItem);
            }, 300);
        };
        
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        showToast('Failed to load items for matching', 'error');
    }
}

function renderMatchItems(items, lostItemId, lostItem) {
    const matchItemsList = document.getElementById('match-items-list');
    const noMatchItems = document.getElementById('no-match-items');
    
    if (items.length === 0) {
        matchItemsList.innerHTML = '';
        noMatchItems.style.display = 'block';
        return;
    }
    
    noMatchItems.style.display = 'none';
    
    // Sort by relevance (same category first)
    const sortedItems = items.sort((a, b) => {
        const aMatch = a.category === lostItem.category ? 1 : 0;
        const bMatch = b.category === lostItem.category ? 1 : 0;
        return bMatch - aMatch;
    });
    
    matchItemsList.innerHTML = sortedItems.map(item => `
        <div class="match-item-card" onclick="confirmMatch('${lostItemId}', '${item.id}')">
            <div class="match-item-image">
                ${item.photo 
                    ? `<img src="${item.photo}" alt="${escapeHtml(item.title)}">`
                    : `<span class="match-item-icon">${getCategoryIcon(item.category)}</span>`
                }
            </div>
            <div class="match-item-info">
                <h4>${escapeHtml(item.title)}</h4>
                <div class="match-item-meta">
                    <span class="match-category">${escapeHtml(item.category)}</span>
                    ${item.category === lostItem.category ? '<span class="match-badge">Same Category</span>' : ''}
                </div>
                <p class="match-item-location">📍 ${escapeHtml(item.location)}</p>
                <p class="match-item-date">📅 Found: ${formatDate(item.date_found)}</p>
                ${item.description ? `<p class="match-item-desc">${escapeHtml(item.description.substring(0, 100))}${item.description.length > 100 ? '...' : ''}</p>` : ''}
            </div>
            <button class="btn btn-primary btn-small">Match</button>
        </div>
    `).join('');
}

async function confirmMatch(lostItemId, foundItemId) {
    if (!confirm('Are you sure you want to match these items? The owner will be notified.')) {
        return;
    }
    
    try {
        const adminName = localStorage.getItem('admin_name') || 'Admin';
        const response = await fetch('/api/admin/match-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                lost_item_id: lostItemId, 
                found_item_id: foundItemId,
                admin_name: adminName
            })
        });
        
        const result = await response.json();
        if (response.ok) {
            showToast('Items matched successfully! The owner has been notified.', 'success');
            closeMatchModal();
            loadLostItems();
            loadDashboardData();
        } else {
            showToast(result.error || 'Failed to match items', 'error');
        }
    } catch (error) {
        showToast('Failed to match items', 'error');
    }
}

window.matchLostItem = matchLostItem;
window.confirmMatch = confirmMatch;

// ========================================
// Utility Functions
// ========================================

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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getHistoryIcon(action) {
    const icons = {
        'found': '🔍',
        'status_changed': '🔄',
        'approved': '✅',
        'claim_submitted': '📝',
        'claimed': '🎉',
        'matched_with_lost_item': '🔗'
    };
    return icons[action] || '📌';
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
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

// Make functions available globally
window.openItemDetail = openItemDetail;
window.closeItemDetail = closeItemDetail;
window.updateItemStatus = updateItemStatus;
window.deleteItem = deleteItem;
window.updateClaimStatus = updateClaimStatus;
window.navigateToSection = navigateToSection;

