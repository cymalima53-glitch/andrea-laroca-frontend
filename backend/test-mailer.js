const { sendEmail } = require('./mailer');
require('dotenv').config();

const email = process.env.GMAIL_USER || 'test@example.com';

console.log('Sending test email to:', email);

// Test data
const data = {
    name: 'Test User',
    email: email,
    subject: 'Test Email from NodeMailer'
};

// Send email using the 'welcome' template (assuming it exists)
// If welcome.html doesn't exist, create a simple one or use another template
sendEmail('welcome', email, data);
