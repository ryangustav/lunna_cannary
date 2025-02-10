const { Schema } = require("mongoose");
const mongoose = require("mongoose");

const rifa_schema = new Schema({
    rifa_user: [{}],
    rifa_winner: String,
    last_rifa_prize: Number,
    rifa_winner_username: String
})

const RifaModel = mongoose.model('RifaSchema', rifa_schema)

module.exports = RifaModel;