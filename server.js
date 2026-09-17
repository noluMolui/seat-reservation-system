// server.js - Main Express Server for Seat Reservation System

const express = require('express');
const cors = require('cors');
const config = require('./config');
const storage = require('./storage');
const rules = require('./rulesEngine');
const { startExpiryTimer } = require('./timer');

const app = express();

// Middleware setup
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serves our HTML/CSS frontend files

// 1. Get all seats status
app.get('/api/seats', (req, res) => {
    res.json({ success: true, seats: storage.seats });
});

// 2. Place a temporary hold on a seat
app.post('/api/holds', (req, res) => {
    const { seatNumber, email } = req.body;
    const currentTime = Date.now();

    // Initialize user history array if it doesn't exist yet
    if (!storage.userHistory.has(email)) {
        storage.userHistory.set(email, []);
    }

    // Run validation checks from rulesEngine
    const validationResult = rules.processPlaceHold(
        seatNumber, 
        email, 
        storage.seats, 
        storage.userHistory, 
        storage.activeHolds, 
        currentTime
    );

    // If rules failed, return error and reason
    if (!validationResult.success) {
        return res.status(400).json(validationResult);
    }

    // Update the seat state in memory
    const seat = storage.seats.find(s => s.seatNumber === seatNumber);
    seat.status = 'held';
    seat.holderEmail = email;
    seat.holdCode = validationResult.holdCode;
    seat.expiryTime = validationResult.expiryTime;

    // Track active hold in storage map
    storage.activeHolds.set(validationResult.holdCode, {
        holdCode: validationResult.holdCode,
        holderEmail: email,
        seatNumber: seatNumber,
        status: 'held',
        expiryTime: validationResult.expiryTime,
        extensionCount: 0
    });

    // Record timestamp for rate-limiting (max 5 per hour)
    storage.userHistory.get(email).push(currentTime);

    // Record event in append-only log
    storage.logEvent('hold_placed', seatNumber, email, validationResult.holdCode);

    // Send successful response back to frontend
    res.status(201).json({
        success: true,
        seatNumber: validationResult.seatNumber,
        holdCode: validationResult.holdCode,
        expiryTime: validationResult.expiryTime
    });
});

// 3. Confirm a held seat
app.post('/api/confirms', (req, res) => {
    const { holdCode, email } = req.body;
    const currentTime = Date.now();

    const validationResult = rules.processConfirmHold(holdCode, email, storage.activeHolds, storage.seats, currentTime);

    if (!validationResult.success) {
        return res.status(400).json(validationResult);
    }

    // Log event if it's not an idempotent repeat request
    if (!validationResult.idempotent) {
        storage.logEvent('hold_confirmed', validationResult.seatNumber, email, holdCode);
    }

    res.json({ success: true, message: 'Hold confirmed successfully.' });
});

// 4. Release a hold or confirmed seat
app.post('/api/releases', (req, res) => {
    const { holdCode, email } = req.body;

    const validationResult = rules.processReleaseSeat(holdCode, email, storage.activeHolds, storage.seats);

    if (!validationResult.success) {
        return res.status(400).json(validationResult);
    }

    storage.logEvent('seat_released', validationResult.seatNumber, email, holdCode);
    res.json({ success: true, message: 'Seat released successfully.' });
});

// 5. Join the waitlist if all seats are taken
app.post('/api/waitlist', (req, res) => {
    const { email } = req.body;

    const validationResult = rules.processJoinWaitlist(email, storage.seats, storage.waitlist, storage.activeHolds);

    if (!validationResult.success) {
        return res.status(400).json(validationResult);
    }

    storage.logEvent('waitlist_joined', null, email, null);
    res.status(201).json({ success: true, message: 'Successfully joined waitlist.' });
});

// 6. Get system event audit logs (optional seat filter)
app.get('/api/logs', (req, res) => {
    const { seatNumber } = req.query;
    let logsToReturn = storage.eventLog;

    if (seatNumber) {
        logsToReturn = logsToReturn.filter(log => log.seatNumber === parseInt(seatNumber));
    }

    res.json({ success: true, logs: logsToReturn });
});

// Start server and launch background timer worker
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startExpiryTimer(); // Background loop checking for expired holds and promoting waitlist
});