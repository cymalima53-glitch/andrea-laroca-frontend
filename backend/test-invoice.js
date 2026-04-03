const { sendEmail } = require('./mailer');
require('dotenv').config();

const email = process.env.GMAIL_USER || 'test@example.com';

console.log('Sending test INVOICE email to:', email);

// Mock data for invoice
const data = {
    subject: 'INVOICE #INV-2024-001 from LA ROCCA',
    invoice_number: 'INV-2024-001',
    customer_name: 'John Doe',
    company_name: 'Doe Coffee Co.',
    customer_email: email,
    customer_phone: '(555) 123-4567',
    customer_address: '123 Coffee Lane, Miami, FL 33101',
    order_id: 'ORD-555',
    invoice_date: new Date().toLocaleDateString(),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 7 days from now
    payment_terms: 'Net 7',
    items_table: `
        <tr class="items-row">
            <td class="item-name">Premium Espresso Beans (5lb Bag)</td>
            <td class="text-right">10</td>
            <td class="text-right">$45.00</td>
            <td class="text-right">$450.00</td>
        </tr>
        <tr class="items-row">
            <td class="item-name">Colombian Medium Roast (5lb Bag)</td>
            <td class="text-right">5</td>
            <td class="text-right">$42.00</td>
            <td class="text-right">$210.00</td>
        </tr>
    `,
    subtotal: '660.00',
    shipping: '25.00',
    tax: '46.20',
    total: '731.20',
    payment_link: 'https://laroccacoffee.com/pay/inv-2024-001'
};

sendEmail('invoice-template', email, data);
