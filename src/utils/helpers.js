const path = require('path');


const ADJECTIVES = ['Happy', 'Quick', 'Smart', 'Bright', 'Cool', 'Clever', 'Bold', 'Super', 'Mega', 'Hyper', 'Ultra', 'Power', 'Wonder', 'Magic', 'Fast'];
const NOUNS = ['Wolf', 'Dev', 'Star', 'Coder', 'Ninja', 'Guru', 'Hero', 'Master', 'Wizard', 'Sage', 'Tiger', 'Eagle', 'Lion', 'Hawk', 'Phoenix'];

const helpers = {
  log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const prefix = type === 'error' ? '❌ ERROR' : 
                  type === 'success' ? '✅ SUCCESS' : 
                  type === 'warn' ? '⚠️ WARN' : 
                  'ℹ️ INFO';
                  
    console.log(`[${timestamp}] ${prefix}: ${message}`);
  },
  
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  },
  
  getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  },
  
  generateUsername() {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `${adjective}${noun}${number}`;
  },
  
  generatePassword() {
    const upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const specialChars = '!@#$%^&*';
    
    const allChars = upperChars + lowerChars + numbers + specialChars;
    
    let password = '';
    
    
    password += upperChars.charAt(Math.floor(Math.random() * upperChars.length));
    password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    
    
    const remainingLength = Math.floor(Math.random() * 3) + 6;
    for (let i = 0; i < remainingLength; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }
};

module.exports = helpers;