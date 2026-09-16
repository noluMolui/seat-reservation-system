// config.js - Central configuration for the Seat Reservation System
module.exports = {
    SEATS_TOTAL: 20,                  // X seats, numbered from 1
    HOLD_EXPIRY_SECONDS: 60,          // Hold expires after 60 seconds
    MAX_ACTIVE_HOLDS_PER_USER: 2,     // Max active (unconfirmed) holds per user
    MAX_HOURLY_HOLDS: 5,              // Max holds per user per hour
    MAX_EXTENSIONS: 2                 // Max extensions allowed per hold
};