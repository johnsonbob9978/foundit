const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Email configuration - loaded from email.config.json
// For demo/competition: Set "enabled" to false to log emails to console
const EMAIL_CONFIG_PATH = path.join(__dirname, 'email.config.json');
let EMAIL_CONFIG = {
    enabled: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: 'vikingfinder@sbhs.edu',
    siteUrl: 'http://localhost:3000'
};

// Load email config from file if it exists
if (fs.existsSync(EMAIL_CONFIG_PATH)) {
    try {
        const configFile = fs.readFileSync(EMAIL_CONFIG_PATH, 'utf8');
        EMAIL_CONFIG = { ...EMAIL_CONFIG, ...JSON.parse(configFile) };
    } catch (error) {
        console.warn('⚠️  Could not load email.config.json, using defaults:', error.message);
    }
}

// Create email transporter (or null if not configured)
let emailTransporter = null;
if (EMAIL_CONFIG.enabled && EMAIL_CONFIG.user && EMAIL_CONFIG.password) {
    // Remove spaces from password (Gmail app passwords often have spaces)
    const cleanPassword = EMAIL_CONFIG.password.replace(/\s+/g, '');
    
    emailTransporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.host,
        port: EMAIL_CONFIG.port,
        secure: EMAIL_CONFIG.secure,
        auth: {
            user: EMAIL_CONFIG.user,
            pass: cleanPassword
        }
    });
}

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const CLAIMS_FILE = path.join(DATA_DIR, 'claims.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

// Create directories if they don't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files
function initDataFiles() {
    if (!fs.existsSync(ITEMS_FILE)) {
        fs.writeFileSync(ITEMS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(CLAIMS_FILE)) {
        fs.writeFileSync(CLAIMS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(ADMIN_FILE)) {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify({ username: 'admin', password: 'school2024' }, null, 2));
    }
}
initDataFiles();

// Data helpers
function readData(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return file === ADMIN_FILE ? { username: 'admin', password: 'school2024' } : [];
    }
}

function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// API Routes

// Get all approved items (for public listing)
app.get('/api/items', (req, res) => {
    const { search, category, sort } = req.query;
    let items = readData(ITEMS_FILE).filter(item => item.status === 'approved');

    if (category && category !== 'all') {
        items = items.filter(item => item.category === category);
    }

    if (search) {
        const searchLower = search.toLowerCase();
        items = items.filter(item => 
            item.title.toLowerCase().includes(searchLower) ||
            (item.description && item.description.toLowerCase().includes(searchLower)) ||
            item.location.toLowerCase().includes(searchLower)
        );
    }

    // Sort by date_found
    if (sort === 'oldest') {
        items.sort((a, b) => new Date(a.date_found) - new Date(b.date_found));
    } else {
        // Default: newest first
        items.sort((a, b) => new Date(b.date_found) - new Date(a.date_found));
    }

    res.json(items);
});

// Get single item
app.get('/api/items/:id', (req, res) => {
    const items = readData(ITEMS_FILE);
    const item = items.find(i => i.id === req.params.id);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
});

// Submit a found item
app.post('/api/items', upload.single('photo'), (req, res) => {
    const { title, description, category, location, date_found, finder_name, finder_email, finder_phone } = req.body;

    if (!title || !category || !location || !date_found || !finder_name || !finder_email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const items = readData(ITEMS_FILE);
    const newItem = {
        id: uuidv4(),
        title,
        description: description || '',
        category,
        location,
        date_found,
        finder_name,
        finder_email,
        finder_phone: finder_phone || '',
        photo: req.file ? `/uploads/${req.file.filename}` : null,
        status: 'pending',
        created_at: new Date().toISOString(),
        history: [{
            action: 'found',
            timestamp: new Date().toISOString(),
            by: finder_name,
            email: finder_email,
            details: `Found at ${location} on ${date_found}`
        }]
    };

    items.push(newItem);
    writeData(ITEMS_FILE, items);

    res.status(201).json({ message: 'Item submitted successfully! It will appear after admin approval.', id: newItem.id });
});

// Submit a claim
app.post('/api/claims', (req, res) => {
    const { item_id, claimant_name, claimant_email, claimant_phone, description } = req.body;

    if (!item_id || !claimant_name || !claimant_email || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const claims = readData(CLAIMS_FILE);
    const items = readData(ITEMS_FILE);
    const newClaim = {
        id: uuidv4(),
        item_id,
        claimant_name,
        claimant_email,
        claimant_phone: claimant_phone || '',
        description,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    claims.push(newClaim);
    writeData(CLAIMS_FILE, claims);

    // Add to item history
    const itemIndex = items.findIndex(i => i.id === item_id);
    if (itemIndex !== -1) {
        if (!items[itemIndex].history) items[itemIndex].history = [];
        items[itemIndex].history.push({
            action: 'claim_submitted',
            timestamp: new Date().toISOString(),
            by: claimant_name,
            email: claimant_email,
            details: `Claim submitted: ${description.substring(0, 50)}...`
        });
        writeData(ITEMS_FILE, items);
    }

    res.status(201).json({ message: 'Claim submitted successfully! We will contact you soon.', id: newClaim.id });
});

// Submit a lost item (reverse claim)
app.post('/api/lost-items', (req, res) => {
    const { title, description, category, location_lost, date_lost, owner_name, owner_email, owner_phone } = req.body;

    if (!title || !category || !location_lost || !date_lost || !owner_name || !owner_email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const LOST_ITEMS_FILE = path.join(DATA_DIR, 'lost-items.json');
    if (!fs.existsSync(LOST_ITEMS_FILE)) {
        fs.writeFileSync(LOST_ITEMS_FILE, JSON.stringify([], null, 2));
    }

    const lostItems = readData(LOST_ITEMS_FILE);
    const newLostItem = {
        id: uuidv4(),
        title,
        description: description || '',
        category,
        location_lost,
        date_lost,
        owner_name,
        owner_email,
        owner_phone: owner_phone || '',
        status: 'active',
        created_at: new Date().toISOString(),
        matched_item_id: null
    };

    lostItems.push(newLostItem);
    writeData(LOST_ITEMS_FILE, lostItems);

    res.status(201).json({ message: 'Lost item reported successfully! We will contact you if it\'s found.', id: newLostItem.id });
});

// Admin authentication
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const admin = readData(ADMIN_FILE);

    if (admin.username === username && admin.password === password) {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// Get all items (admin)
app.get('/api/admin/items', (req, res) => {
    const { status } = req.query;
    let items = readData(ITEMS_FILE);

    if (status && status !== 'all') {
        items = items.filter(item => item.status === status);
    }

    // Sort by created_at descending
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(items);
});

// Update item status (admin)
app.patch('/api/admin/items/:id', (req, res) => {
    const { status, admin_name } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'claimed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const items = readData(ITEMS_FILE);
    const itemIndex = items.findIndex(i => i.id === id);

    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }

    const oldStatus = items[itemIndex].status;
    items[itemIndex].status = status;
    
    // Track history
    if (!items[itemIndex].history) items[itemIndex].history = [];
    items[itemIndex].history.push({
        action: 'status_changed',
        timestamp: new Date().toISOString(),
        by: admin_name || 'Admin',
        details: `Status changed from ${oldStatus} to ${status}`
    });

    // If approved, track approval
    if (status === 'approved' && oldStatus === 'pending') {
        items[itemIndex].history.push({
            action: 'approved',
            timestamp: new Date().toISOString(),
            by: admin_name || 'Admin',
            details: 'Item approved and made public'
        });
    }

    writeData(ITEMS_FILE, items);

    res.json({ message: 'Item status updated successfully' });
});

// Delete item (admin)
app.delete('/api/admin/items/:id', (req, res) => {
    const { id } = req.params;
    const items = readData(ITEMS_FILE);
    const itemIndex = items.findIndex(i => i.id === id);

    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }

    // Delete associated photo
    const item = items[itemIndex];
    if (item.photo) {
        const photoPath = path.join(__dirname, 'public', item.photo);
        if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
        }
    }

    // Remove claims for this item
    const claims = readData(CLAIMS_FILE);
    const updatedClaims = claims.filter(c => c.item_id !== id);
    writeData(CLAIMS_FILE, updatedClaims);

    // Remove item
    items.splice(itemIndex, 1);
    writeData(ITEMS_FILE, items);

    res.json({ message: 'Item deleted successfully' });
});

// Get all claims (admin)
app.get('/api/admin/claims', (req, res) => {
    const claims = readData(CLAIMS_FILE);
    const items = readData(ITEMS_FILE);

    // Add item title to each claim
    const claimsWithItems = claims.map(claim => {
        const item = items.find(i => i.id === claim.item_id);
        return {
            ...claim,
            item_title: item ? item.title : 'Unknown Item'
        };
    });

    // Sort by created_at descending
    claimsWithItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(claimsWithItems);
});

// Update claim status (admin)
app.patch('/api/admin/claims/:id', (req, res) => {
    const { status, admin_name } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const claims = readData(CLAIMS_FILE);
    const claimIndex = claims.findIndex(c => c.id === id);

    if (claimIndex === -1) {
        return res.status(404).json({ error: 'Claim not found' });
    }

    const oldStatus = claims[claimIndex].status;
    claims[claimIndex].status = status;
    writeData(CLAIMS_FILE, claims);

    // If claim is approved, mark item as claimed and track history
    if (status === 'approved') {
        const items = readData(ITEMS_FILE);
        const itemIndex = items.findIndex(i => i.id === claims[claimIndex].item_id);
        if (itemIndex !== -1) {
            items[itemIndex].status = 'claimed';
            if (!items[itemIndex].history) items[itemIndex].history = [];
            items[itemIndex].history.push({
                action: 'claimed',
                timestamp: new Date().toISOString(),
                by: claims[claimIndex].claimant_name,
                email: claims[claimIndex].claimant_email,
                details: `Item claimed by ${claims[claimIndex].claimant_name}. Approved by ${admin_name || 'Admin'}`
            });
            writeData(ITEMS_FILE, items);
        }
    }

    res.json({ message: 'Claim status updated successfully' });
});

// Get dashboard stats (admin)
app.get('/api/admin/stats', (req, res) => {
    const items = readData(ITEMS_FILE);
    const claims = readData(CLAIMS_FILE);
    const LOST_ITEMS_FILE = path.join(DATA_DIR, 'lost-items.json');
    const lostItems = fs.existsSync(LOST_ITEMS_FILE) ? readData(LOST_ITEMS_FILE) : [];

    // Category breakdown
    const categoryCounts = {};
    items.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    // Items over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentItems = items.filter(item => new Date(item.created_at) >= thirtyDaysAgo);

    res.json({
        totalItems: items.length,
        pendingItems: items.filter(i => i.status === 'pending').length,
        approvedItems: items.filter(i => i.status === 'approved').length,
        claimedItems: items.filter(i => i.status === 'claimed').length,
        rejectedItems: items.filter(i => i.status === 'rejected').length,
        pendingClaims: claims.filter(c => c.status === 'pending').length,
        activeLostItems: lostItems.filter(l => l.status === 'active').length,
        categoryCounts,
        recentItemsCount: recentItems.length
    });
});

// Get public stats (safe to show everyone)
app.get('/api/stats', (req, res) => {
    const items = readData(ITEMS_FILE);
    const approvedItems = items.filter(i => i.status === 'approved' || i.status === 'claimed');
    
    // Category breakdown (only approved items)
    const categoryCounts = {};
    approvedItems.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    // Items found this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthItems = approvedItems.filter(item => new Date(item.date_found) >= startOfMonth);

    // Success rate (claimed vs total)
    const claimedCount = approvedItems.filter(i => i.status === 'claimed').length;
    const successRate = approvedItems.length > 0 ? Math.round((claimedCount / approvedItems.length) * 100) : 0;

    res.json({
        totalFoundItems: approvedItems.length,
        itemsThisMonth: thisMonthItems.length,
        claimedItems: claimedCount,
        successRate,
        categoryCounts
    });
});

// Get lost items (admin)
app.get('/api/admin/lost-items', (req, res) => {
    const LOST_ITEMS_FILE = path.join(DATA_DIR, 'lost-items.json');
    if (!fs.existsSync(LOST_ITEMS_FILE)) {
        return res.json([]);
    }
    const lostItems = readData(LOST_ITEMS_FILE);
    res.json(lostItems);
});

// Match lost item with found item (admin)
app.post('/api/admin/match-item', (req, res) => {
    const { lost_item_id, found_item_id, admin_name } = req.body;
    
    if (!lost_item_id || !found_item_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const LOST_ITEMS_FILE = path.join(DATA_DIR, 'lost-items.json');
    if (!fs.existsSync(LOST_ITEMS_FILE)) {
        return res.status(404).json({ error: 'Lost items file not found' });
    }

    const lostItems = readData(LOST_ITEMS_FILE);
    const items = readData(ITEMS_FILE);

    const lostItemIndex = lostItems.findIndex(l => l.id === lost_item_id);
    const foundItemIndex = items.findIndex(i => i.id === found_item_id);

    if (lostItemIndex === -1 || foundItemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }

    // Match the items
    lostItems[lostItemIndex].matched_item_id = found_item_id;
    lostItems[lostItemIndex].status = 'matched';
    lostItems[lostItemIndex].matched_at = new Date().toISOString();
    lostItems[lostItemIndex].matched_by = admin_name || 'Admin';

    // Add to found item history
    if (!items[foundItemIndex].history) items[foundItemIndex].history = [];
    items[foundItemIndex].history.push({
        action: 'matched_with_lost_item',
        timestamp: new Date().toISOString(),
        by: admin_name || 'Admin',
        details: `Matched with lost item report by ${lostItems[lostItemIndex].owner_name}`
    });

    writeData(LOST_ITEMS_FILE, lostItems);
    writeData(ITEMS_FILE, items);

    // Send email notification to the lost item owner
    const lostItem = lostItems[lostItemIndex];
    const foundItem = items[foundItemIndex];
    
    sendMatchNotificationEmail(lostItem, foundItem).catch(err => {
        console.error('Failed to send email notification:', err);
        // Don't fail the request if email fails
    });

    res.json({ message: 'Items matched successfully' });
});

// ========================================
// Email Functions
// ========================================

async function sendMatchNotificationEmail(lostItem, foundItem) {
    const emailContent = {
        to: lostItem.owner_email,
        subject: `🎉 Good News! Your Lost Item May Have Been Found - Viking Finder`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .item-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #1e40af; }
                    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Great News!</h1>
                        <p>Your Lost Item May Have Been Found</p>
                    </div>
                    <div class="content">
                        <p>Hello ${lostItem.owner_name},</p>
                        
                        <p>We have great news! An item matching your lost item report has been found at South Brunswick High School.</p>
                        
                        <div class="item-card">
                            <h3>Your Lost Item:</h3>
                            <p><strong>${lostItem.title}</strong></p>
                            <p>Category: ${lostItem.category}</p>
                            <p>Location Lost: ${lostItem.location_lost}</p>
                            <p>Date Lost: ${new Date(lostItem.date_lost).toLocaleDateString()}</p>
                        </div>
                        
                        <div class="item-card">
                            <h3>Found Item:</h3>
                            <p><strong>${foundItem.title}</strong></p>
                            <p>Category: ${foundItem.category}</p>
                            <p>Location Found: ${foundItem.location}</p>
                            <p>Date Found: ${new Date(foundItem.date_found).toLocaleDateString()}</p>
                            ${foundItem.description ? `<p>Description: ${foundItem.description}</p>` : ''}
                        </div>
                        
                        <p><strong>Next Steps:</strong></p>
                        <ol>
                            <li>Please visit the Viking Finder website to view the full details</li>
                            <li>If this is your item, you can submit a claim with proof of ownership</li>
                            <li>Once verified, you can pick up your item from the SBHS main office</li>
                        </ol>
                        
                        <p style="text-align: center;">
                            <a href="${EMAIL_CONFIG.siteUrl}" class="button">View Item on Viking Finder</a>
                        </p>
                        
                        <p>If you have any questions, please contact the SBHS main office.</p>
                        
                        <div class="footer">
                            <p>Viking Finder - South Brunswick High School</p>
                            <p>Helping Vikings reunite with their belongings</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Great News! Your Lost Item May Have Been Found

Hello ${lostItem.owner_name},

We have great news! An item matching your lost item report has been found at South Brunswick High School.

Your Lost Item: ${lostItem.title}
Category: ${lostItem.category}
Location Lost: ${lostItem.location_lost}
Date Lost: ${new Date(lostItem.date_lost).toLocaleDateString()}

Found Item: ${foundItem.title}
Category: ${foundItem.category}
Location Found: ${foundItem.location}
Date Found: ${new Date(foundItem.date_found).toLocaleDateString()}

Next Steps:
1. Please visit the Viking Finder website to view the full details
2. If this is your item, you can submit a claim with proof of ownership
3. Once verified, you can pick up your item from the SBHS main office

Visit: ${EMAIL_CONFIG.siteUrl}

If you have any questions, please contact the SBHS main office.

Viking Finder - South Brunswick High School
        `
    };

    // If email is configured, send it
    if (emailTransporter) {
        try {
            await emailTransporter.sendMail({
                from: `"Viking Finder" <${EMAIL_CONFIG.from}>`,
                ...emailContent
            });
            console.log(`✅ Email sent to ${lostItem.owner_email}`);
        } catch (error) {
            console.error('Email sending error:', error);
            // Log email content for demo purposes
            logEmailForDemo(emailContent);
        }
    } else {
        // Demo mode: Log email content
        logEmailForDemo(emailContent);
    }
}

function logEmailForDemo(emailContent) {
    console.log('\n📧 ===== EMAIL NOTIFICATION (Demo Mode) =====');
    console.log(`To: ${emailContent.to}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log('\nEmail would be sent with the following content:');
    console.log('(In production, this would be sent via SMTP)');
    console.log('==========================================\n');
}

// Start server
app.listen(PORT, () => {
    console.log(`\n🔍 Viking Finder - School Lost & Found`);
    console.log(`   Server running at http://localhost:${PORT}`);
    console.log(`   Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`   Default admin: username "admin", password "school2024"`);
    if (emailTransporter) {
        console.log(`   ✅ Email notifications: ENABLED`);
        console.log(`   📧 Sending from: ${EMAIL_CONFIG.from}`);
    } else {
        console.log(`   📧 Email notifications: Demo mode (emails logged to console)`);
        console.log(`   To enable email: Edit email.config.json and set "enabled": true`);
    }
    console.log();
});
