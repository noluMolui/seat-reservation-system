// storage.js - In-memory data store abstraction
const config = require('./config');

const seats = Array.from({ length: config.SEATS_TOTAL }, (_, i) => ({
    seatNumber: i + 1,
    status: 'available', // 'available', 'held', 'confirmed'
    holderEmail: null,
    holdCode: null,
    expiryTime: null,
    extensionCount: 0
}));

// Maps and Arrays for state management
const activeHolds = new Map(); // holdCode -> holdObject
const userHistory = new Map(); // email -> array of timestamps (hourly holds)
const waitlist = [];           // array of emails
const eventLog = [];           // append-only log array

function logEvent(type, seatNumber, email, holdCode) {
    eventLog.push({
        timestamp: new Date().toISOString(),
        type,
        seatNumber,
        email,
        holdCode: holdCode || null
    });
}

module.exports = {
    seats,
    activeHolds,
    userHistory,
    waitlist,
    eventLog,
    logEvent
};