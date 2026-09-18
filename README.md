# Event Seat Reservation System

A full-stack Node.js seat reservation and ticketing management application featuring a strict rules engine, automated background expiry/waitlist promotion, and a live frontend dashboard.

## Live Deployment
* **Live App URL:** [https://seat-reservation-system-lmrt.onrender.com/](https://seat-reservation-system-lmrt.onrender.com/)

---

## Features & Business Rules
* **Configurable Seats:** Dynamic seat layout (default: 20 seats numbered from 1).
* **Smart Hold Codes:** Unique 6-character uppercase codes that **strictly exclude** confusing characters (`0, O, 1, I, L`).
* **Active Limits:** Users cannot hold more than 2 unconfirmed seats concurrent.
* **Rate Limiting:** Maximum of 5 holds per user per hour.
* **Hold Extension:** Active holds can be extended up to 2 times, resetting the expiry countdown.
* **Idempotent Confirmation:** Confirmed seats lock permanently to the user's email until released.
* **Automated Waitlist & Timer:** When all seats are full, users can join a FIFO waitlist. A background timer worker automatically promotes waitlisted users when seats expire or are released.
* **Append-Only Audit Log:** Tracks every state change with precise timestamps.

---

## Configuration Quick Reference

| Setting | Default Value | Description |
| :--- | :--- | :--- |
| **Seats per event** | 20 | Total number of available event seats |
| **Hold expiry time** | 60 seconds | Duration before an unconfirmed hold expires |
| **Max concurrent holds** | 2 | Maximum active unconfirmed holds per user |
| **Max holds per hour** | 5 | Hourly rate limit per user email |
| **Max extensions** | 2 | Maximum times a hold can be extended |

*(Configuration values can easily be adjusted in your `config.js` file).*

---

## Getting Started Locally

### Prerequisites
* [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone the repository or open your project folder in your terminal.
2. Install dependencies:
   ```bash
   npm install
