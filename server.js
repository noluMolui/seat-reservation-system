// server.js - Main entry point for the API
const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();
app.use(express.json());
app.use(cors());

// In-memory storage placeholders (we will build a proper storage file next)
const seats = Array.from({ length: config.SEATS_TOTAL }, (_, i) => ({
    seatNumber: i + 1,
    status: 'available', // 'available', 'held', or 'confirmed'
    holderEmail: null,
    holdCode: null,
    expiryTime: null,
    extensionCount: 0
}));

// Basic route to test that your API is working and returning seats
app.get('/api/seats', (req, res) => {
    res.json({
        success: true,
        seats: seats
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Seat Reservation API running on http://localhost:${PORT}`);
});