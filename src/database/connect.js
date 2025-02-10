const mongoose = require('mongoose');
require('dotenv').config();

module.exports = function db_connect() {
try {
mongoose.connect(`mongodb+srv://${process.env.db_user}:${process.env.db_password}@cluster0.hmxntqd.mongodb.net/lunnarcannarycoins?retryWrites=true&w=majority&appName=Cluster0`)
return { connection_status: "connected" }
} 
catch {
return { connection_status: "disconnected" }
}
}