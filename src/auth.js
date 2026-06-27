require('dotenv').config();
const axios = require('axios');

const AUTH_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token';

let _token = null;
let _expiresAt = 0;

async function getToken() {
  const now = Date.now();

  if (_token && now < _expiresAt - 60000) {
    return _token;
  }

  const response = await axios.post(
    `${AUTH_URL}?grant_type=client_credentials`,
    null,
    {
      headers: {
        Authorization: process.env.HOTMART_BASIC,
        'Content-Type': 'application/json'
      }
    }
  );

  _token = response.data.access_token;
  _expiresAt = now + response.data.expires_in * 1000;

  console.log('🔑 Token OAuth2 renovado com sucesso');
  return _token;
}

module.exports = { getToken };
