const https = require('https');
require('dotenv').config();
const key = process.env.GEMINI_API_KEY;
https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).models.map(m => m.name)));
});
