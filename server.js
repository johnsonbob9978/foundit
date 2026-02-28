import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDk7F8oWz3NI-Ikd8crh0mWGdAZLhdC6fU",
    authDomain: "viking-vault-c8c2a.firebaseapp.com",
    projectId: "viking-vault-c8c2a",
    storageBucket: "viking-vault-c8c2a.firebasestorage.app",
    messagingSenderId: "182969920672",
    appId: "1:182969920672:web:10656fccf940951ba42dc5",
    measurementId: "G-M5RWRJH460"
};

// Initialize Firebase (Analytics is browser-only, not used on server)
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Email configuration - loaded from email.config.json
const EMAIL_CONFIG_PATH = path.join(__dirname, 'email.config.json');
let EMAIL_CONFIG = {
    enabled: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: 'vikingfinder@sbhs.edu',
    siteUrl: 'http://localhost:3001'
};

if (fs.existsSync(EMAIL_CONFIG_PATH)) {
    try {
        const configFile = fs.readFileSync(EMAIL_CONFIG_PATH, 'utf8');
        EMAIL_CONFIG = { ...EMAIL_CONFIG, ...JSON.parse(configFile) };
    } catch (error) {
        console.warn('⚠️  Could not load email.config.json, using defaults:', error.message);
    }
}

let emailTransporter = null;
if (EMAIL_CONFIG.enabled && EMAIL_CONFIG.user && EMAIL_CONFIG.password) {
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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ========================================
// Firestore Helper Functions
// ========================================

async function getCollection(collectionName) {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getDocument(collectionName, id) {
    const snap = await getDoc(doc(db, collectionName, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

async function setDocument(collectionName, id, data) {
    await setDoc(doc(db, collectionName, id), data);
}

async function updateDocument(collectionName, id, data) {
    await updateDoc(doc(db, collectionName, id), data);
}

async function deleteDocument(collectionName, id) {
    await deleteDoc(doc(db, collectionName, id));
}

// Seed admin credentials in Firestore on first run
async function initAdminCredentials() {
    try {
        const adminSnap = await getDoc(doc(db, 'config', 'admin'));
        if (!adminSnap.exists()) {
            await setDoc(doc(db, 'config', 'admin'), { username: 'admin', password: 'school2024' });
            console.log('✅ Admin credentials initialized in Firestore');
        }
    } catch (error) {
        console.error('⚠️  Could not initialize admin credentials:', error.message);
    }
}

// ========================================
// Middleware
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads (photos stay on disk)
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
    limits: { fileSize: 5 * 1024 * 1024 },
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

// ========================================
// API Routes
// ========================================

// Get all approved items (public listing)
app.get('/api/items', async (req, res) => {
    try {
        const { search, category, sort } = req.query;
        let items = (await getCollection('items')).filter(item => item.status === 'approved');

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

        if (sort === 'oldest') {
            items.sort((a, b) => new Date(a.date_found) - new Date(b.date_found));
        } else {
            items.sort((a, b) => new Date(b.date_found) - new Date(a.date_found));
        }

        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// Get single item
app.get('/api/items/:id', async (req, res) => {
    try {
        const item = await getDocument('items', req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

// Submit a found item
app.post('/api/items', upload.single('photo'), async (req, res) => {
    try {
        const { title, description, category, location, date_found, finder_name, finder_email, finder_phone } = req.body;

        if (!title || !category || !location || !date_found || !finder_name || !finder_email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        const newItem = {
            id,
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

        await setDocument('items', id, newItem);
        res.status(201).json({ message: 'Item submitted successfully! It will appear after admin approval.', id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit item' });
    }
});

// Submit a claim
app.post('/api/claims', async (req, res) => {
    try {
        const { item_id, claimant_name, claimant_email, claimant_phone, description } = req.body;

        if (!item_id || !claimant_name || !claimant_email || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        const newClaim = {
            id,
            item_id,
            claimant_name,
            claimant_email,
            claimant_phone: claimant_phone || '',
            description,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        await setDocument('claims', id, newClaim);

        // Append to item history
        const item = await getDocument('items', item_id);
        if (item) {
            const history = item.history || [];
            history.push({
                action: 'claim_submitted',
                timestamp: new Date().toISOString(),
                by: claimant_name,
                email: claimant_email,
                details: `Claim submitted: ${description.substring(0, 50)}...`
            });
            await updateDocument('items', item_id, { history });
        }

        res.status(201).json({ message: 'Claim submitted successfully! We will contact you soon.', id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit claim' });
    }
});

// Submit a lost item (reverse claim)
app.post('/api/lost-items', async (req, res) => {
    try {
        const { title, description, category, location_lost, date_lost, owner_name, owner_email, owner_phone } = req.body;

        if (!title || !category || !location_lost || !date_lost || !owner_name || !owner_email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        const newLostItem = {
            id,
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

        await setDocument('lostItems', id, newLostItem);
        res.status(201).json({ message: "Lost item reported successfully! We will contact you if it's found.", id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to report lost item' });
    }
});

// Admin authentication
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await getDocument('config', 'admin');

        if (admin && admin.username === username && admin.password === password) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get all items (admin)
app.get('/api/admin/items', async (req, res) => {
    try {
        const { status } = req.query;
        let items = await getCollection('items');

        if (status && status !== 'all') {
            items = items.filter(item => item.status === status);
        }

        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// Update item status (admin)
app.patch('/api/admin/items/:id', async (req, res) => {
    try {
        const { status, admin_name } = req.body;
        const { id } = req.params;

        if (!['pending', 'approved', 'claimed', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const item = await getDocument('items', id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const oldStatus = item.status;
        const history = item.history || [];
        history.push({
            action: 'status_changed',
            timestamp: new Date().toISOString(),
            by: admin_name || 'Admin',
            details: `Status changed from ${oldStatus} to ${status}`
        });

        if (status === 'approved' && oldStatus === 'pending') {
            history.push({
                action: 'approved',
                timestamp: new Date().toISOString(),
                by: admin_name || 'Admin',
                details: 'Item approved and made public'
            });
        }

        await updateDocument('items', id, { status, history });
        res.json({ message: 'Item status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// Delete item (admin)
app.delete('/api/admin/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = await getDocument('items', id);

        if (!item) return res.status(404).json({ error: 'Item not found' });

        // Delete associated photo from disk
        if (item.photo) {
            const photoPath = path.join(__dirname, 'public', item.photo);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        }

        // Delete all claims linked to this item
        const claims = await getCollection('claims');
        await Promise.all(
            claims.filter(c => c.item_id === id).map(c => deleteDocument('claims', c.id))
        );

        await deleteDocument('items', id);
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Get all claims (admin)
app.get('/api/admin/claims', async (req, res) => {
    try {
        const [claims, items] = await Promise.all([
            getCollection('claims'),
            getCollection('items')
        ]);

        const claimsWithItems = claims.map(claim => {
            const item = items.find(i => i.id === claim.item_id);
            return { ...claim, item_title: item ? item.title : 'Unknown Item' };
        });

        claimsWithItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(claimsWithItems);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch claims' });
    }
});

// Update claim status (admin)
app.patch('/api/admin/claims/:id', async (req, res) => {
    try {
        const { status, admin_name } = req.body;
        const { id } = req.params;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const claim = await getDocument('claims', id);
        if (!claim) return res.status(404).json({ error: 'Claim not found' });

        await updateDocument('claims', id, { status });

        // If claim approved, mark the item as claimed and record history
        if (status === 'approved') {
            const item = await getDocument('items', claim.item_id);
            if (item) {
                const history = item.history || [];
                history.push({
                    action: 'claimed',
                    timestamp: new Date().toISOString(),
                    by: claim.claimant_name,
                    email: claim.claimant_email,
                    details: `Item claimed by ${claim.claimant_name}. Approved by ${admin_name || 'Admin'}`
                });
                await updateDocument('items', claim.item_id, { status: 'claimed', history });
            }
        }

        res.json({ message: 'Claim status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update claim' });
    }
});

// Get dashboard stats (admin)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [items, claims, lostItems] = await Promise.all([
            getCollection('items'),
            getCollection('claims'),
            getCollection('lostItems')
        ]);

        const categoryCounts = {};
        items.forEach(item => {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        });

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
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get public stats
app.get('/api/stats', async (req, res) => {
    try {
        const items = await getCollection('items');
        const approvedItems = items.filter(i => i.status === 'approved' || i.status === 'claimed');

        const categoryCounts = {};
        approvedItems.forEach(item => {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthItems = approvedItems.filter(item => new Date(item.date_found) >= startOfMonth);

        const claimedCount = approvedItems.filter(i => i.status === 'claimed').length;
        const successRate = approvedItems.length > 0 ? Math.round((claimedCount / approvedItems.length) * 100) : 0;

        res.json({
            totalFoundItems: approvedItems.length,
            itemsThisMonth: thisMonthItems.length,
            claimedItems: claimedCount,
            successRate,
            categoryCounts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get lost items (admin)
app.get('/api/admin/lost-items', async (req, res) => {
    try {
        const lostItems = await getCollection('lostItems');
        res.json(lostItems);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch lost items' });
    }
});

// Match lost item with found item (admin)
app.post('/api/admin/match-item', async (req, res) => {
    try {
        const { lost_item_id, found_item_id, admin_name } = req.body;

        if (!lost_item_id || !found_item_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [lostItem, foundItem] = await Promise.all([
            getDocument('lostItems', lost_item_id),
            getDocument('items', found_item_id)
        ]);

        if (!lostItem || !foundItem) {
            return res.status(404).json({ error: 'Item not found' });
        }

        await updateDocument('lostItems', lost_item_id, {
            matched_item_id: found_item_id,
            status: 'matched',
            matched_at: new Date().toISOString(),
            matched_by: admin_name || 'Admin'
        });

        const history = foundItem.history || [];
        history.push({
            action: 'matched_with_lost_item',
            timestamp: new Date().toISOString(),
            by: admin_name || 'Admin',
            details: `Matched with lost item report by ${lostItem.owner_name}`
        });
        await updateDocument('items', found_item_id, { status: 'claimed', history });

        sendMatchNotificationEmail(lostItem, foundItem).catch(err => {
            console.error('Failed to send email notification:', err);
        });

        res.json({ message: 'Items matched successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to match items' });
    }
});

// ========================================
// Email Functions
// ========================================

async function sendMatchNotificationEmail(lostItem, foundItem) {
    const emailContent = {
        to: lostItem.owner_email,
        subject: `🎉 Good News! Your Lost Item May Have Been Found - Viking Vault`,
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
                            <li>Please visit the Viking Vault website to view the full details</li>
                            <li>If this is your item, you can submit a claim with proof of ownership</li>
                            <li>Once verified, you can pick up your item from the SBHS main office</li>
                        </ol>
                        
                        <p style="text-align: center;">
                            <a href="${EMAIL_CONFIG.siteUrl}" class="button">View Item on Viking Vault</a>
                        </p>
                        
                        <p>If you have any questions, please contact the SBHS main office.</p>
                        
                        <div class="footer">
                            <p>Viking Vault - South Brunswick High School</p>
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
1. Please visit the Viking Vault website to view the full details
2. If this is your item, you can submit a claim with proof of ownership
3. Once verified, you can pick up your item from the SBHS main office

Visit: ${EMAIL_CONFIG.siteUrl}

If you have any questions, please contact the SBHS main office.

Viking Vault - South Brunswick High School
        `
    };

    if (emailTransporter) {
        try {
            await emailTransporter.sendMail({
                from: `"Viking Vault" <${EMAIL_CONFIG.from}>`,
                ...emailContent
            });
            console.log(`✅ Email sent to ${lostItem.owner_email}`);
        } catch (error) {
            console.error('Email sending error:', error);
            logEmailForDemo(emailContent);
        }
    } else {
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

// ========================================
// Start Server
// ========================================

await initAdminCredentials();

app.listen(PORT, () => {
    console.log(`\n🔍 Viking Vault - School Lost & Found`);
    console.log(`   Server running at http://localhost:${PORT}`);
    console.log(`   Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`   Default admin: username "admin", password "school2024"`);
    console.log(`   Database: Firebase Firestore (project: viking-vault-c8c2a)`);
    if (emailTransporter) {
        console.log(`   ✅ Email notifications: ENABLED`);
        console.log(`   📧 Sending from: ${EMAIL_CONFIG.from}`);
    } else {
        console.log(`   📧 Email notifications: Demo mode (emails logged to console)`);
        console.log(`   To enable email: Edit email.config.json and set "enabled": true`);
    }
    console.log();
});
