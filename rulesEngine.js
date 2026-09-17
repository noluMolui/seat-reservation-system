// rulesEngine.js - Core business logic validation for the seat reservation system

// 1. Process placing a new hold
function processPlaceHold(seatNumber, email, seats, userHistory, activeHolds, currentTime) {
    // Check if seat exists
    const seat = seats.find(s => s.seatNumber === seatNumber);
    if (!seat) {
        return { success: false, reason: 'Seat does not exist.' };
    }

    // Check if seat is already taken
    if (seat.status !== 'available') {
        return { success: false, reason: 'Seat is not available.' };
    }

    // Check user active holds limit (max 2)
    let activeCount = 0;
    for (const hold of activeHolds.values()) {
        if (hold.holderEmail === email && hold.status === 'held') {
            activeCount++;
        }
    }
    if (activeCount >= 2) {
        return { success: false, reason: 'Maximum active holds (2) exceeded.' };
    }

    // Check hourly rate limit (max 5 per hour)
    const history = userHistory.get(email) || [];
    const oneHourAgo = currentTime - (60 * 60 * 1000);
    const recentHolds = history.filter(timestamp => timestamp > oneHourAgo);
    if (recentHolds.length >= 5) {
        return { success: false, reason: 'Hourly hold limit (5 per hour) reached.' };
    }

    // Generate unique 6-character code (excluding 0, O, 1, I, L)
    const holdCode = generateUniqueCode(activeHolds);
    const expiryTime = currentTime + (60 * 1000); // 60 seconds expiry

    return {
        success: true,
        seatNumber,
        holdCode,
        expiryTime
    };
}

// 2. Process confirming a hold
function processConfirmHold(holdCode, email, activeHolds, seats, currentTime) {
    const hold = activeHolds.get(holdCode);

    if (!hold) {
        return { success: false, reason: 'Invalid or expired hold code.' };
    }

    // Check if the email matches the person who placed the hold
    if (hold.holderEmail !== email) {
        return { success: false, reason: 'Email does not match the holder of this code.' };
    }

    // Check if already confirmed (Idempotency rule)
    if (hold.status === 'confirmed') {
        return { success: true, idempotent: true, seatNumber: hold.seatNumber };
    }

    // Check if expired
    if (currentTime > hold.expiryTime) {
        return { success: false, reason: 'Hold has already expired.' };
    }

    // Update hold and seat status to confirmed
    hold.status = 'confirmed';
    // Remove expiry time so confirmed seats don't expire automatically
    hold.expiryTime = null; 

    const seat = seats.find(s => s.seatNumber === hold.seatNumber);
    if (seat) {
        seat.status = 'confirmed';
        seat.expiryTime = null;
    }

    return { success: true, idempotent: false, seatNumber: hold.seatNumber };
}

// 3. Process releasing a seat
function processReleaseSeat(holdCode, email, activeHolds, seats) {
    const hold = activeHolds.get(holdCode);

    if (!hold) {
        return { success: false, reason: 'Invalid hold code.' };
    }

    // Ensure the email matches
    if (hold.holderEmail !== email) {
        return { success: false, reason: 'Email does not match the owner of this hold.' };
    }

    const seatNumber = hold.seatNumber;

    // Remove from active holds
    activeHolds.delete(holdCode);

    // Free up the seat
    const seat = seats.find(s => s.seatNumber === seatNumber);
    if (seat) {
        seat.status = 'available';
        seat.holderEmail = null;
        seat.holdCode = null;
        seat.expiryTime = null;
    }

    return { success: true, seatNumber };
}

// Helper: Generate 6-char code excluding 0, O, 1, I, L
function generateUniqueCode(activeHolds) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Omitted 0, O, 1, I, L
    let code = '';
    do {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (activeHolds.has(code));
    return code;
}

module.exports = {
    processPlaceHold,
    processConfirmHold,
    processReleaseSeat
};