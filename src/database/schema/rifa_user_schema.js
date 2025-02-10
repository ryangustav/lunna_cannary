const { Schema } = require("mongoose");
const mongoose = require("mongoose");

const rifa_user_schema = new Schema({
    user_id: String,
    rifa_user: [{}]
})

const RifaUserModel = mongoose.model('RifaUserSchema', rifa_user_schema)

module.exports = RifaUserModel;