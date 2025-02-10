const { Schema } = require("mongoose");
const mongoose = require("mongoose");

const ban_schema = new Schema({
    user_id: String,
    isBanned: {
    type: Boolean, default: 0
    },
    prompts_sexuais: {
        type: Number, default: 0,
    },
})

const bania = mongoose.model("banned_users", ban_schema);

module.exports = bania;