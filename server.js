require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Import cors

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON bodies

// Environment variables validation
const { EXTERNAL_API_URL, EXTERNAL_API_USERNAME, EXTERNAL_API_PASSWORD } = process.env;

if (!EXTERNAL_API_URL || !EXTERNAL_API_USERNAME || !EXTERNAL_API_PASSWORD) {
    console.error('Error: Missing required environment variables for external API.');
    process.exit(1); // Exit if credentials are not set
}

app.get('/api/validate-card/:card_no', async (req, res) => {
    const { card_no } = req.params;

    if (!card_no) {
        return res.status(400).json({ message: 'Card number is required.' });
    }

    const apiUrl = `${EXTERNAL_API_URL}${encodeURIComponent(card_no)}`;

    console.log(`Forwarding request for card_no: ${card_no} to ${apiUrl}`);

    try {
        const response = await axios.get(apiUrl, {
            auth: {
                username: EXTERNAL_API_USERNAME,
                password: EXTERNAL_API_PASSWORD
            }
        });
        console.log('External API Response Status:', response.status);
        console.log('External API Response Data:', response.data);
        
        // Check if the API returned data indicating a valid card
        // The external API returns a 200 OK with an empty items array for invalid cards
        // or items array with data for valid cards.
        if (response.data && response.data.items && response.data.items.length > 0) {
            res.json({ valid: true, data: response.data.items[0] });
        } else {
            // Even if the status is 200, if items array is empty, consider it invalid
            res.status(404).json({ valid: false, message: 'Invalid Card or Card Not Found' });
        }

    } catch (error) {
        console.error('Error calling external API:', error.message);
        if (error.response) {
            console.error('External API Error Status:', error.response.status);
            console.error('External API Error Data:', error.response.data);
            // Forward the error status and message from the external API if available
            // Or provide a generic error if the external API's error isn't helpful
            if (error.response.status === 404) {
                 res.status(404).json({ valid: false, message: 'Invalid Card or Card Not Found (API 404)' });
            } else {
                 res.status(error.response.status || 500).json({
                    message: 'Failed to validate card with external service.',
                    error: error.response.data || error.message
                });
            }
        } else {
            // Network error or other issue not directly from an API response
            res.status(500).json({ message: 'Failed to connect to external card validation service.' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

// Add a basic route to confirm the server is running
app.get('/', (req, res) => {
    res.send('NFC Auth Backend Server is running!');
});
