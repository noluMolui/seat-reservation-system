// server.js - Main entry point for the API
const express = require('express');
const cors = require('cors');
const config = require('./config');
const storage = require('./storage');
const rules = require('./rulesEngine');
const { startExpiryTimer } = require('./timer');

const app = express();

// --- 1. MIDDLEWARE ---
app.use(express.json());                    // Parses incoming JSON request payloads
app.use(cors());                            // Enables Cross-Origin Resource Sharing
app.use(express.static('public'));          // Serves your frontend HTML/JS files from the 'public' folder

// --- 2. API ROUTES ---

// Get Seats Status
app.get('/api/seats', (req, res) => {
    res.json({ success: true, seats: storage.seats });
});

// Place a Hold
app.post('/api/holds', (req, res) => {
    const { seatNumber, email } = req.body;
    const currentTime = Date.now();

    if (!storage.userHistory.has(email)) {
        storage.userHistory.set(email, []);
    }

    const result = rules.processPlaceHold(
        seatNumber, 
        email, 
        storage.seats, 
        storage.userHistory, 
        storage.activeHolds, 
        currentTime
    );

    if (!result.success) {
        return res.status(400).json(result);
    }

    const seat = storage.seats.find(s => s.seatNumber === seatNumber);
    seat.status = 'held';
    seat.holderEmail = email;
    seat.holdCode = result.holdCode;
    seat.expiryTime = result.expiryTime;

    storage.activeHolds.set(result.holdCode, {
        holdCode: result.holdCode,
        holderEmail: email,
        seatNumber,
        status: 'held',
        expiryTime: result.expiryTime,
        extensionCount: 0
    });

    storage.userHistory.get(email).push(currentTime);
    storage.logEvent('hold_placed', seatNumber, email, result.holdCode);

    res.status(201).json({
        success: true,
        seatNumber: result.seatNumber,
        holdCode: result.holdCode,
        expiryTime: result.expiryTime
    });
});

// Confirm a Hold
app.post('/api/confirms', (req, res) => {
    const { holdCode, email } = req.body;
    const currentTime = Date.now();

    const result = rules.processConfirmHold(holdCode, email, storage.activeHolds, storage.seats, currentTime);

    if (!result.success) {
        return res.status(400).json(result);
    }

    if (!result.idempotent) {
        storage.logEvent('hold_confirmed', result.seatNumber, email, holdCode);
    }

    res.json({ success: true, message: 'Hold confirmed successfully.' });
});

// Release a Seat
app.post('/api/releases', (req, res) => {
    const { holdCode, email } = req.body;

    const result = rules.processReleaseSeat(holdCode, email, storage.activeHolds, storage.seats);

    if (!result.success) {
        return res.status(400).json(result);
    }

    storage.logEvent('seat_released', result.seatNumber, email, holdCode);
    res.json({ success: true, message: 'Seat released successfully.' });
});

// Join Waitlist
app.post('/api/waitlist', (req, res) => {
    const { email } = req.body;

    const result = rules.processJoinWaitlist(email, storage.seats, storage.waitlist, storage.activeHolds);

    if (!result.success) {
        return res.status(400).json(result);
    }

    storage.logEvent('waitlist_joined', null, email, null);
    res.status(201).json({ success: true, message: 'Successfully joined waitlist.' });
});

// Get Event Log
app.get('/api/logs', (req, res) => {
    const { seatNumber } = req.query;
    let logs = storage.eventLog;

    if (seatNumber) {
        logs = logs.filter(log => log.seatNumber === parseInt(seatNumber));
    }

    res.json({ success: true, logs });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Seat Reservation API running on http://localhost:${PORT}`);
    startExpiryTimer(); // Boots up the background expiry & promotion worker
});