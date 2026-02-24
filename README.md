# FoundIt - School Lost & Found Website

A modern, fully functional lost-and-found management system designed for school communities. Built with Node.js, Express, and SQLite.

![FoundIt](https://img.shields.io/badge/FoundIt-School%20Lost%20%26%20Found-0d9488)

## Features

### For Students & Staff
- **Browse Found Items** - Search and filter through all reported found items
- **Report Found Items** - Submit items you've found with photos and details
- **Claim Items** - Submit a claim with proof of ownership
- **Real-time Updates** - See newly posted items as they're approved

### For Administrators
- **Dashboard Overview** - Quick stats on items and claims
- **Item Management** - Approve, reject, or delete item submissions
- **Claims Processing** - Review and process ownership claims
- **Photo Management** - View uploaded item photos

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite (via better-sqlite3)
- **File Upload**: Multer
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Design**: Custom CSS with modern UI/UX

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Clone or navigate to the project directory:
```bash
cd foundit
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
- **Main Site**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin.html

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `school2024`

## Project Structure

```
foundit/
├── server.js           # Express server and API routes
├── package.json        # Project dependencies
├── foundit.db          # SQLite database (auto-created)
├── public/
│   ├── index.html      # Main website
│   ├── admin.html      # Admin panel
│   ├── styles.css      # Main styles
│   ├── admin.css       # Admin panel styles
│   ├── app.js          # Frontend JavaScript
│   ├── admin.js        # Admin panel JavaScript
│   └── uploads/        # Uploaded photos
└── README.md
```

## API Endpoints

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | Get all approved items (supports ?search & ?category) |
| GET | `/api/items/:id` | Get single item details |
| POST | `/api/items` | Submit a found item (multipart/form-data) |
| POST | `/api/claims` | Submit a claim for an item |

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin authentication |
| GET | `/api/admin/items` | Get all items (supports ?status filter) |
| PATCH | `/api/admin/items/:id` | Update item status |
| DELETE | `/api/admin/items/:id` | Delete an item |
| GET | `/api/admin/claims` | Get all claims |
| PATCH | `/api/admin/claims/:id` | Update claim status |
| GET | `/api/admin/stats` | Get dashboard statistics |

## Usage Guide

### Reporting a Found Item
1. Click "Report Found Item" on the homepage
2. Fill in the item details (name, category, location, date)
3. Optionally upload a photo
4. Enter your contact information
5. Submit - the item will appear after admin approval

### Claiming an Item
1. Browse or search for your lost item
2. Click on the item card to view details
3. Click "Claim This Item"
4. Provide proof of ownership (describe unique features, contents, etc.)
5. Submit - admin will review and contact you

### Admin Workflow
1. Log in at `/admin.html`
2. Review pending item submissions
3. Approve legitimate items to make them visible
4. Review claims and verify ownership proof
5. Approve claims to mark items as claimed

## Customization

### Changing Admin Password
Edit `server.js` and modify the default admin credentials:
```javascript
db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)').run('admin', 'your-new-password');
```
Note: Delete the `foundit.db` file to reset the database with new credentials.

### Styling
- Main colors are defined as CSS variables in `styles.css`
- Modify `--color-primary` for the main brand color
- Modify `--color-accent` for accent elements

## Email Notifications

Viking Vault can send email notifications when lost items are matched with found items.

### Demo Mode (Default)
By default, emails are logged to the console for demonstration purposes. This is perfect for the competition as it doesn't require email configuration.

### Production Setup
To enable actual email sending, edit the `email.config.json` file:

```json
{
  "enabled": true,
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "your-email@gmail.com",
  "password": "your-app-password",
  "from": "vikingfinder@sbhs.edu",
  "siteUrl": "https://your-domain.com"
}
```

**Note:** 
- Set `"enabled": true` to activate email sending
- For Gmail, you'll need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password
- Update `siteUrl` to your actual website URL

### Email Content
When a lost item is matched, the owner receives an email with:
- Details of their lost item
- Details of the found item
- Instructions on how to claim the item
- Link to the Viking Vault website

## License

This project is created for educational purposes as a school project.

---

Built with ❤️ for the school community

