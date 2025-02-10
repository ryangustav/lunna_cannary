const { Schema } = require("mongoose");
const mongoose = require("mongoose");

const daily_schema = new Schema({
    user_id: String,
    daily_collected: { type: Boolean, default: false }
})

const dailyCollect = mongoose.model("dailyCollect", daily_schema);

module.exports = dailyCollect;