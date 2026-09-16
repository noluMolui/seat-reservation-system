// rulesEngine.js - Core business logic for the Seat Reservation System
const config = require('./config');

// Helper: Generate a unique 6-character code (Uppercase letters & digits, excluding 0, O, 1, I, L)
function generateHoldCode(activeHoldsMap) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Excluded: 0, O, 1, I, L
    let code;
    let isDuplicate = true;

    // Keep generating until we find a code that isn't currently used by an active hold
    while (isDuplicate) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Check if code already exists in active holds
        isDuplicate = Array.from(activeHoldsMap.values()).some(hold => hold.holdCode === code);
    }
    return code;
}

// Function to validate and process placing a hold
function processPlaceHold(seatNumber, email, seats, userHistory, activeHolds, currentTime) {
    // 1. Check if seat number is valid
    if (seatNumber < 1 || seatNumber > config.SEATS_TOTAL) {
        return { success: false, reason: 'Invalid seat number.' };
    }

    const seat = seats.find(s => s.seatNumber === seatNumber);
    // 2. Check if seat is available
    if (seat.status !== 'available') {
        return { success: false, reason: `Seat ${seatNumber} is already ${seat.status}.` };
    }

    // 3. Check active holds limit for this user (max 2 unconfirmed active holds)
    const userActiveHolds = Array.from(activeHolds.values()).filter(h => h.holderEmail === email && h.status === 'held');
    if (userActiveHolds.length >= config.MAX_ACTIVE_HOLDS_PER_USER) {
        return { success: false, reason: 'User has reached the maximum number of active holds (2).' };
    }

    // 4. Check hourly limit (max 5 holds per hour)
    const oneHourAgo = currentTime - (60 * 60 * 1000);
    const userHourlyHolds = (userHistory.get(email) || []).filter(timestamp => timestamp > oneHourAgo);
    if (userHourlyHolds.length >= config.MAX_HOURLY_HOLDS) {
        return { success: false, reason: 'User has reached the maximum holds per hour limit (5).' };
    }

    // 5. Generate unique hold code
    const holdCode = generateHoldCode(activeHolds);

    return {
        success: true,
        holdCode,
        expiryTime: currentTime + (config.HOLD_EXPIRY_SECONDS * 1000),
        seatNumber
    };
}

module.exports = {
    processPlaceHold,
    generateHoldCode
};