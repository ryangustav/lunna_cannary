const express = require('express')
const axios = require('axios')
require('dotenv').config();

async function topgg(user_id) {
  axios.get(`https://topgg-api.discloud.app/get-voted?id=${user_id}`, async data => {
console.log(data)
return data;
})
}

module.exports = topgg;