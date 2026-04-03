const { z } = require('zod');

const registerSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    company_name: z.string().min(2, 'Company name is required for wholesale accounts'),
    phone: z.string().min(5, 'Phone number is required'),
    address: z.string().min(5, 'Address is required'),
    business_type: z.string().min(1, 'Business type is required'),
    inquiry_type: z.string().min(1, 'Inquiry type is required'),
    contacted_salesperson: z.string().optional(),
    website: z.string().optional(),
    message: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const cartItemSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
});

module.exports = {
    registerSchema,
    loginSchema,
    cartItemSchema
};
