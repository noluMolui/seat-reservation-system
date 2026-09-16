// timer.js - Background process for handling hold expiries and waitlist promotion
const config = require('./config');
const storage = require('./storage');

function startExpiryTimer() {
    // Run every 2 seconds
    setInterval(() => {
        const currentTime = Date.now();

        // 1. Find all held seats that have expired
        storage.seats.forEach(seat => {
            if (seat.status === 'held' && seat.expiryTime && currentTime >= seat.expiryTime) {
                const expiredCode = seat.holdCode;
                const expiredEmail = seat.holderEmail;
                const seatNum = seat.seatNumber;

                // Reset seat to available
                seat.status = 'available';
                seat.holderEmail = null;
                seat.holdCode = null;
                seat.expiryTime = null;
                seat.extensionCount = 0;

                // Remove from active holds map
                storage.activeHolds.delete(expiredCode);

                // Log the expiry event
                storage.logEvent('hold_expired', seatNum, expiredEmail, expiredCode);
                console.log(`[Timer] Hold expired for Seat ${seatNum} (${expiredEmail})`);

                // 2. Waitlist Promotion: If waitlist is not empty, promote the first user
                if (storage.waitlist.length > 0) {
                    const nextEmail = storage.waitlist.shift(); // Take first user off queue
                    const newHoldCode = generateAutomaticHoldCode(storage.activeHolds);
                    const newExpiry = currentTime + (config.HOLD_EXPIRY_SECONDS * 1000);

                    // Assign hold to the promoted user
                    seat.status = 'held';
                    seat.holderEmail = nextEmail;
                    seat.holdCode = newHoldCode;
                    seat.expiryTime = newExpiry;
                    seat.extensionCount = 0;

                    storage.activeHolds.set(newHoldCode, {
                        holdCode: newHoldCode,
                        holderEmail: nextEmail,
                        seatNumber: seatNum,
                        status: 'held',
                        expiryTime: newExpiry,
                        extensionCount: 0
                    });

                    // Log the waitlist promotion (does not count toward hourly limit per rules)
                    storage.logEvent('waitlist_promoted', seatNum, nextEmail, newHoldCode);
                    console.log(`[Waitlist] Promoted ${nextEmail} to Seat ${seatNum} with code ${newHoldCode}`);
                }
            }
        });
    }, 2000);
}

// Helper for generating code during automatic promotion
function generateAutomaticHoldCode(activeHoldsMap) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code;
    let isDuplicate = true;
    while (isDuplicate) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        isDuplicate = Array.from(activeHoldsMap.values()).some(hold => hold.holdCode === code);
    }
    return code;
}

module.exports = { startExpiryTimer };