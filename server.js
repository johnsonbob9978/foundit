const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

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
    const { search, category } = req.query;
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

    // Sort by date_found descending
    items.sort((a, b) => new Date(b.date_found) - new Date(a.date_found));

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
        created_at: new Date().toISOString()
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

    res.status(201).json({ message: 'Claim submitted successfully! We will contact you soon.', id: newClaim.id });
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
    const { status } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'claimed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const items = readData(ITEMS_FILE);
    const itemIndex = items.findIndex(i => i.id === id);

    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }

    items[itemIndex].status = status;
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
    const { status } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const claims = readData(CLAIMS_FILE);
    const claimIndex = claims.findIndex(c => c.id === id);

    if (claimIndex === -1) {
        return res.status(404).json({ error: 'Claim not found' });
    }

    claims[claimIndex].status = status;
    writeData(CLAIMS_FILE, claims);

    // If claim is approved, mark item as claimed
    if (status === 'approved') {
        const items = readData(ITEMS_FILE);
        const itemIndex = items.findIndex(i => i.id === claims[claimIndex].item_id);
        if (itemIndex !== -1) {
            items[itemIndex].status = 'claimed';
            writeData(ITEMS_FILE, items);
        }
    }

    res.json({ message: 'Claim status updated successfully' });
});

// Get dashboard stats (admin)
app.get('/api/admin/stats', (req, res) => {
    const items = readData(ITEMS_FILE);
    const claims = readData(CLAIMS_FILE);

    res.json({
        totalItems: items.length,
        pendingItems: items.filter(i => i.status === 'pending').length,
        approvedItems: items.filter(i => i.status === 'approved').length,
        claimedItems: items.filter(i => i.status === 'claimed').length,
        pendingClaims: claims.filter(c => c.status === 'pending').length
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🔍 FoundIt - School Lost & Found`);
    console.log(`   Server running at http://localhost:${PORT}`);
    console.log(`   Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`   Default admin: username "admin", password "school2024"\n`);
});
