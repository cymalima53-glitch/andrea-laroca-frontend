const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    }
});

function sendEmail(templateName, email, data) {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);

    // Check if template exists
    if (!fs.existsSync(templatePath)) {
        console.error(`Template not found: ${templatePath}`);
        return;
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    for (let key in data) {
        // Create a regex to replace all occurrences of {{key}}
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    }

    transporter.sendMail({
        from: `"LA ROCCA" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: data.subject || 'LA ROCCA',
        html: html
    }, (err, info) => {
        if (err) console.log('Email error:', err);
        else console.log('Email sent:', info.response);
    });
}

module.exports = { sendEmail };
