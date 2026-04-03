const { sendEmail } = require('../mailer');
const dotenv = require('dotenv');
dotenv.config();

const sendRegistrationEmail = async (user) => {
    try {
        const data = {
            subject: 'Welcome to LA ROCCA',
            name: user.username,
            company_name: user.company_name,
            login_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`
        };
        await sendEmail('welcome', user.email, data);
        console.log(`Registration email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending registration email:', error);
    }
};

const sendAdminNotificationEmail = async (adminEmail, newUser) => {
    try {
        const data = {
            subject: 'New Wholesale Application',
            message: `New application from ${newUser.company_name} (${newUser.email})`,
            customer_name: newUser.username,
            order_id: 'N/A',
            total_amount: '0.00'
        };
        // Use admin-notification template
        await sendEmail('admin-notification', adminEmail, data);
        console.log(`Admin notification email sent to ${adminEmail}`);
    } catch (error) {
        console.error('Error sending admin notification email:', error);
    }
};

const sendApprovalEmail = async (user) => {
    try {
        const data = {
            subject: 'Your Wholesale Account is Approved!',
            customer_name: user.username,
            company_name: user.company_name,
            login_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`
        };
        await sendEmail('approved', user.email, data);
        console.log(`Approval email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending approval email:', error);
    }
};

const sendRejectionEmail = async (user) => {
    try {
        const data = {
            subject: 'Update on your Wholesale Application',
            customer_name: user.username,
            company_name: user.company_name
        };
        await sendEmail('rejected', user.email, data);
        console.log(`Rejection email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending rejection email:', error);
    }
};

const sendOrderConfirmationEmail = async (order, items) => {
    try {
        // Format items for orderConfirmation.html (div list)
        const itemsList = items.map(item => {
            const price = item.price_at_time || item.price || 0;
            const name = item.name || 'Item';
            return `<div class="item">
                <span class="item-name">${name}</span>
                <span class="item-qty">x${item.quantity} - $${Number(price).toFixed(2)}</span>
            </div>`;
        }).join('');

        const subtotal = Number(order.total_amount).toFixed(2);
        const shipping = '0.00'; // Or calculate if available
        const total = subtotal; // Adjust if shipping is added

        const data = {
            subject: `Order Confirmation #${order.id}`,
            customer_name: order.customer_name,
            order_id: order.id,
            order_date: new Date(order.created_at).toLocaleDateString(),
            items_list: itemsList,
            subtotal: subtotal,
            shipping: shipping,
            total: total
        };

        await sendEmail('orderConfirmation', order.customer_email, data);
        console.log(`Order confirmation email sent to ${order.customer_email}`);

        // Notify Admin as well (reuse order confirmation or admin notification)
        const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER; // Fallback to sender
        if (adminEmail) {
            const adminData = {
                subject: `New Order #${order.id} from ${order.customer_name}`,
                message: `New order received. Total: $${total}`,
                customer_name: order.customer_name,
                order_id: order.id,
                total_amount: total
            };
            await sendEmail('admin-notification', adminEmail, adminData);
        }

    } catch (error) {
        console.error('Error sending order confirmation email:', error);
    }
};

const sendInvoiceEmail = async (order, items) => {
    try {
        // Format items for invoice-template.html (table rows)
        const itemsTable = items.map(item => `
            <tr class="items-row">
                <td class="item-name">${item.name}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${Number(item.price_at_time).toFixed(2)}</td>
                <td class="text-right">$${(Number(item.price_at_time) * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        const subtotal = Number(order.total_amount).toFixed(2);
        const shipping = '0.00'; // Customize as needed
        const tax = '0.00'; // Customize as needed
        const total = (Number(subtotal) + Number(shipping) + Number(tax)).toFixed(2);

        // Calculate due date (e.g., 7 days from now or order date)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const data = {
            subject: `INVOICE #${order.id} from LA ROCCA`,
            invoice_number: order.id,
            customer_name: order.customer_name,
            company_name: order.company_name || 'Valued Customer',
            customer_email: order.customer_email,
            customer_phone: order.customer_phone || '',
            customer_address: order.customer_address || '',
            order_id: order.id,
            invoice_date: new Date().toLocaleDateString(),
            due_date: dueDate.toLocaleDateString(),
            payment_terms: 'Net 7',
            items_table: itemsTable,
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            total: total,
            payment_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${order.id}`
        };

        // Use invoice-template
        await sendEmail('invoice-template', order.customer_email, data);
        console.log(`Invoice email sent to ${order.customer_email}`);

    } catch (error) {
        console.error('Error sending invoice email:', error);
    }
}

module.exports = {
    sendRegistrationEmail,
    sendAdminNotificationEmail,
    sendApprovalEmail,
    sendRejectionEmail,
    sendOrderConfirmationEmail,
    sendInvoiceEmail
};
