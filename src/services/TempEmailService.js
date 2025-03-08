const axios = require('axios');
const helpers = require('../utils/helpers');

class TempEmailService {
  constructor() {
    this.baseUrl = 'https://api.mail.tm';
    this.account = null;
    this.token = null;
  }

  async createAccount() {
    try {

      helpers.log('Obtendo domínios disponíveis...');
      const domainsResponse = await axios.get(`${this.baseUrl}/domains`);
      const domain = domainsResponse.data["hydra:member"][0].domain;
      
      const username = `user${Math.floor(Math.random() * 100000)}${Date.now().toString().slice(-4)}`;
      const password = `pass${Math.random().toString(36).substring(2, 10)}`;
      const email = `${username}@${domain}`;
      
      helpers.log(`Criando conta com email: ${email}`);
      await axios.post(`${this.baseUrl}/accounts`, {
        address: email,
        password: password
      });
      
      helpers.log('Obtendo token de acesso...');
      const tokenResponse = await axios.post(`${this.baseUrl}/token`, {
        address: email,
        password: password
      });
      
      this.account = { email, password };
      this.token = tokenResponse.data.token;
      
      helpers.log(`Email temporário criado: ${email}`, 'success');
      return this.account;
    } catch (error) {
      helpers.log('Erro ao criar email temporário: ' + error.message, 'error');
      throw new Error(`Falha ao criar email temporário: ${error.message}`);
    }
  }
  
  async checkInbox(maxAttempts = 30, delaySeconds = 5) {
    if (!this.token) {
      throw new Error('É necessário criar uma conta antes de verificar a caixa de entrada');
    }
    
    helpers.log(`Verificando emails para ${this.account.email}...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      helpers.log(`Tentativa ${attempt}/${maxAttempts} de verificar emails...`);
      
      try {
        const response = await axios.get(`${this.baseUrl}/messages`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        const messages = response.data["hydra:member"];
        
        if (messages && messages.length > 0) {
          helpers.log(`${messages.length} email(s) encontrado(s)!`, 'success');
          return messages;
        }
        
        await helpers.delay(delaySeconds * 1000);
      } catch (error) {
        helpers.log('Erro ao verificar emails: ' + error.message, 'warn');
        await helpers.delay(delaySeconds * 1000);
      }
    }
    
    helpers.log('Tempo limite excedido. Nenhum email recebido.', 'error');
    return [];
  }
  
  async getMessageDetails(messageId) {
    if (!this.token) {
      throw new Error('É necessário criar uma conta antes de ler mensagens');
    }
    
    try {
      helpers.log(`Obtendo detalhes da mensagem ${messageId}...`);
      const response = await axios.get(`${this.baseUrl}/messages/${messageId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      const messageData = response.data;
      
      helpers.log('Estrutura da resposta do email:');
      helpers.log(`- Tem HTML: ${Boolean(messageData.html)}`);
      helpers.log(`- Tem texto: ${Boolean(messageData.text)}`);
      
      if (!messageData.html && !messageData.text) {
        helpers.log('Formato de email não padrão. Analisando estrutura...', 'warn');
        helpers.log('Propriedades disponíveis: ' + Object.keys(messageData).join(', '));
      }
      
      return messageData;
    } catch (error) {
      helpers.log(`Erro ao obter detalhes da mensagem ${messageId}: ${error.message}`, 'error');
      throw error;
    }
  }
}

module.exports = TempEmailService;