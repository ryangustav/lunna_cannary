const mongoose = require('mongoose');

const rouletteGameSchema = new mongoose.Schema({
    channel_id: { type: String, required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    players: [{
        user_id: String,
        amount: Number,
        bet_type: String,
        timestamp: Date
    }],
    result: {
        number: Number,
        color: String,
        parity: String,
        section: String,
        winners: [{
            user_id: String,
            amount: Number,
            winnings: Number
        }],
        losers: [{
            user_id: String,
            amount: Number
        }],
        total_pot: Number,
        house_fee: Number
    }
});

module.exports = mongoose.model('RouletteGame', rouletteGameSchema);