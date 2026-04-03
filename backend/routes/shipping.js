const express = require('express');
const router = express.Router();
const axios = require('axios');

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
const SHIPPO_BASE_URL = 'https://api.goshippo.com';

// UPS Ground service level token
const UPS_GROUND_SERVICE = 'ups_ground';

/**
 * @route   POST /api/shipping/shippo
 * @desc    Get real UPS Ground shipping rate from Shippo
 * @access  Public
 * 
 * Input: { origin_zip, destination_zip, weight, dimensions? }
 * Output: { rate, days, service, carrier }
 */
router.post('/shippo', async (req, res) => {
    try {
        const { origin_zip, destination_zip, weight, dimensions } = req.body;

        // Validate required fields
        if (!origin_zip || !destination_zip || !weight) {
            return res.status(400).json({ 
                error: 'Missing required fields: origin_zip, destination_zip, weight' 
            });
        }

        // Check if Shippo is configured
        if (!SHIPPO_API_KEY || SHIPPO_API_KEY === 'your_key_here') {
            return res.status(503).json({
                error: 'Shippo not configured',
                message: 'Add SHIPPO_API_KEY to .env to enable real shipping rates'
            });
        }

        // Default dimensions if not provided (in inches)
        const defaultDimensions = {
            length: '10',
            width: '8',
            height: '6'
        };
        const dims = dimensions || defaultDimensions;

        // Build Shippo shipment request
        const shipmentData = {
            address_from: {
                zip: origin_zip,
                country: 'US'
            },
            address_to: {
                zip: destination_zip,
                country: 'US'
            },
            parcels: [{
                length: dims.length,
                width: dims.width,
                height: dims.height,
                distance_unit: 'in',
                weight: weight.toString(),
                mass_unit: 'lb'
            }],
            async: false
        };

        // Call Shippo API
        const response = await axios.post(
            `${SHIPPO_BASE_URL}/shipments/`,
            shipmentData,
            {
                headers: {
                    'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const shipment = response.data;

        // Filter for UPS Ground only
        const upsGroundRates = shipment.rates?.filter(rate => 
            rate.servicelevel?.token === UPS_GROUND_SERVICE ||
            rate.servicelevel?.name?.toLowerCase().includes('ground')
        );

        if (!upsGroundRates || upsGroundRates.length === 0) {
            // Fallback: try to get any UPS rate
            const upsRates = shipment.rates?.filter(rate =>
                rate.provider?.toLowerCase().includes('ups')
            );
            
            if (!upsRates || upsRates.length === 0) {
                return res.status(404).json({
                    error: 'No UPS Ground rates available for this route',
                    message: 'Try a different zip code or contact support'
                });
            }

            // Use first available UPS rate as fallback
            const rate = upsRates[0];
            return res.json({
                rate: parseFloat(rate.amount),
                days: parseInt(rate.days) || 3,
                service: rate.servicelevel?.name || 'UPS Ground',
                carrier: rate.provider,
                currency: rate.currency,
                shippo_object_id: rate.object_id
            });
        }

        // Get the best UPS Ground rate (lowest price)
        const bestRate = upsGroundRates.sort((a, b) => 
            parseFloat(a.amount) - parseFloat(b.amount)
        )[0];

        res.json({
            rate: parseFloat(bestRate.amount),
            days: parseInt(bestRate.days) || 3,
            service: bestRate.servicelevel?.name || 'UPS Ground',
            carrier: bestRate.provider,
            currency: bestRate.currency,
            shippo_object_id: bestRate.object_id
        });

    } catch (error) {
        console.error('Shippo API Error:', error.response?.data || error.message);
        
        // Return user-friendly error
        if (error.response?.status === 401) {
            return res.status(500).json({
                error: 'Shipping service authentication failed',
                message: 'Please contact support'
            });
        }

        if (error.response?.status === 400) {
            return res.status(400).json({
                error: 'Invalid shipping address or parameters',
                details: error.response?.data
            });
        }

        res.status(500).json({
            error: 'Failed to calculate shipping rate',
            message: 'Please try again or contact support'
        });
    }
});

/**
 * @route   POST /api/shipping/create-label
 * @desc    Create a shipping label via Shippo (for admin)
 * @access  Private (Admin)
 * 
 * Input: { rate_object_id, order_id }
 * Output: { tracking_number, label_url, eta }
 */
router.post('/create-label', async (req, res) => {
    try {
        const { rate_object_id, order_id } = req.body;

        if (!rate_object_id) {
            return res.status(400).json({ error: 'Rate object ID is required' });
        }

        if (!SHIPPO_API_KEY) {
            return res.status(503).json({ error: 'Shippo not configured' });
        }

        // Purchase the shipping label
        const transactionData = {
            rate: rate_object_id,
            label_file_type: 'PDF',
            async: false
        };

        const response = await axios.post(
            `${SHIPPO_BASE_URL}/transactions/`,
            transactionData,
            {
                headers: {
                    'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const transaction = response.data;

        if (transaction.status !== 'SUCCESS') {
            return res.status(400).json({
                error: 'Failed to create shipping label',
                message: transaction.messages || 'Unknown error'
            });
        }

        res.json({
            success: true,
            tracking_number: transaction.tracking_number,
            tracking_url: transaction.tracking_url_provider,
            label_url: transaction.label_url,
            eta: transaction.eta,
            order_id: order_id,
            carrier: transaction.rate?.provider,
            service: transaction.rate?.servicelevel?.name
        });

    } catch (error) {
        console.error('Shippo Label Creation Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to create shipping label',
            message: error.response?.data?.detail || error.message
        });
    }
});

/**
 * @route   GET /api/shipping/validate-address
 * @desc    Validate a shipping address
 * @access  Public
 */
router.post('/validate-address', async (req, res) => {
    try {
        const { street, city, state, zip, country } = req.body;

        if (!SHIPPO_API_KEY) {
            return res.status(503).json({ error: 'Shippo not configured' });
        }

        const addressData = {
            street1: street,
            city: city,
            state: state,
            zip: zip,
            country: country || 'US',
            validate: true
        };

        const response = await axios.post(
            `${SHIPPO_BASE_URL}/addresses/`,
            addressData,
            {
                headers: {
                    'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const address = response.data;

        res.json({
            valid: address.validation_results?.is_valid !== false,
            normalized: {
                street: address.street1,
                city: address.city,
                state: address.state,
                zip: address.zip
            },
            messages: address.validation_results?.messages || []
        });

    } catch (error) {
        console.error('Address Validation Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to validate address',
            message: error.message
        });
    }
});

module.exports = router;
