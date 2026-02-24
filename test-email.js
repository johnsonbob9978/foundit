const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load email config
const EMAIL_CONFIG_PATH = path.join(__dirname, 'email.config.json');

if (!fs.existsSync(EMAIL_CONFIG_PATH)) {
    console.error('❌ email.config.json not found!');
    process.exit(1);
}

const EMAIL_CONFIG = JSON.parse(fs.readFileSync(EMAIL_CONFIG_PATH, 'utf8'));

console.log('\n📧 Testing Email Configuration...\n');
console.log('Configuration:');
console.log(`  Host: ${EMAIL_CONFIG.host}`);
console.log(`  Port: ${EMAIL_CONFIG.port}`);
console.log(`  User: ${EMAIL_CONFIG.user}`);
console.log(`  From: ${EMAIL_CONFIG.from}`);
console.log(`  Password: ${EMAIL_CONFIG.password ? '***' + EMAIL_CONFIG.password.slice(-4) : 'NOT SET'}`);
console.log();

// Remove spaces from password
const cleanPassword = EMAIL_CONFIG.password.replace(/\s+/g, '');
console.log(`  Cleaned password length: ${cleanPassword.length} characters`);
console.log(`  Password preview: ${cleanPassword.substring(0, 4)}...${cleanPassword.substring(cleanPassword.length - 4)}\n`);

// Create transporter
const transporter = nodemailer.createTransport({
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: {
        user: EMAIL_CONFIG.user,
        pass: cleanPassword
    }
});

// Test connection and send email
async function testEmail() {
    try {
        console.log('🔍 Testing SMTP connection...');
        
        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');
        
        // Send test email
        console.log('📤 Sending test email...');
        const testEmail = EMAIL_CONFIG.user; // Send to yourself
        
        const info = await transporter.sendMail({
            from: `"Viking Vault Test" <${EMAIL_CONFIG.from}>`,
            to: testEmail,
            subject: '🧪 Viking Vault Email Test',
            html: `
                <h2>Email Test Successful! 🎉</h2>
                <p>If you're reading this, your email configuration is working correctly.</p>
                <p><strong>Configuration Details:</strong></p>
                <ul>
                    <li>Host: ${EMAIL_CONFIG.host}</li>
                    <li>Port: ${EMAIL_CONFIG.port}</li>
                    <li>From: ${EMAIL_CONFIG.from}</li>
                </ul>
                <p>You can now use email notifications in Viking Vault!</p>
            `,
            text: `
Email Test Successful! 🎉

If you're reading this, your email configuration is working correctly.

Configuration Details:
- Host: ${EMAIL_CONFIG.host}
- Port: ${EMAIL_CONFIG.port}
- From: ${EMAIL_CONFIG.from}

You can now use email notifications in Viking Vault!
            `
        });
        
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Sent to: ${testEmail}`);
        console.log('\n📬 Check your inbox (and spam folder) for the test email.\n');
        
    } catch (error) {
        console.error('\n❌ Email test failed!\n');
        console.error('Error details:');
        console.error(`  Code: ${error.code || 'N/A'}`);
        console.error(`  Response: ${error.response || error.message}`);
        console.error(`  Command: ${error.command || 'N/A'}\n`);
        
        if (error.code === 'EAUTH') {
            console.log('💡 Authentication Error - Possible issues:');
            console.log('   1. App password is incorrect');
            console.log('   2. 2-factor authentication is not enabled');
            console.log('   3. "Less secure app access" needs to be enabled');
            console.log('   4. Account email does not match');
            console.log('\n   For Gmail:');
            console.log('   - Make sure 2FA is enabled');
            console.log('   - Generate a new App Password at:');
            console.log('     https://myaccount.google.com/apppasswords');
            console.log('   - Use the 16-character password (no spaces)\n');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.log('💡 Connection Error - Check:');
            console.log('   1. Internet connection');
            console.log('   2. Firewall settings');
            console.log('   3. SMTP host and port are correct\n');
        }
        
        process.exit(1);
    }
}

testEmail();
