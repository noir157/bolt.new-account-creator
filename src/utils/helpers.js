const fs = require('fs');
const path = require('path');

const helpers = {

  getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  },
  
  async randomDelay(min = 300, max = 800) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
  },
  

  async delay(timeout) {
    await new Promise(resolve => setTimeout(resolve, timeout));
  },
  
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },
  

  saveToFile(filePath, content) {
    this.ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
  },
  
  generateUsername() {
    const prefix = 'user_';
    const randomPart = Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${randomPart}${timestamp}`;
  },
  
  generatePassword() {
    const randomPart = Math.random().toString(36).substring(2, 8);
    const number = Math.floor(Math.random() * 900) + 100; // 100-999
    return `Pass_${randomPart}_${number}!`;
  },
  
  log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const prefix = {
      info: '📘 INFO',
      warn: '⚠️ AVISO',
      error: '❌ ERRO',
      success: '✅ SUCESSO'
    }[type] || '📘 INFO';
    
    console.log(`[${timestamp}] ${prefix}: ${message}`);
  }
};

module.exports = helpers;