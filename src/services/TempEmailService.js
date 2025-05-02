
const axios = require('axios');
const helpers = require('../utils/helpers');

class TempMailService2 {
  constructor() {
    this.baseUrl = 'https://api.mail.tm';
    this.account = null;
    this.token = null;
  }

  async createAccount() {
    try {
      helpers.log('Obtendo domínios disponíveis do Mail.tm...');
      
      let domainsResponse;
      try {
        domainsResponse = await axios.get(`${this.baseUrl}/domains`, {
          timeout: 30000
        });
      } catch (axiosError) {
        console.error('Erro na requisição de domínios:', axiosError);
        throw new Error(`Falha ao obter domínios: ${axiosError.message || 'Erro de rede'}`);
      }
      
      if (!domainsResponse || !domainsResponse.data || !Array.isArray(domainsResponse.data["hydra:member"])) {
        throw new Error('Resposta inválida da API de domínios');
      }
      
      const domains = domainsResponse.data["hydra:member"];
      
      if (domains.length === 0) {
        throw new Error('Nenhum domínio disponível retornado pela API');
      }
      
      const activeDomains = domains.filter(domain => domain.isActive);
      
      if (activeDomains.length === 0) {
        throw new Error('Não há domínios ativos disponíveis');
      }
      
      const selectedDomain = activeDomains[Math.floor(Math.random() * activeDomains.length)];
      const domainName = selectedDomain.domain;
      
      const username = `user${Math.floor(Math.random() * 100000)}${Date.now().toString().slice(-4)}`;
      const password = `Pass${Math.random().toString(36).substring(2, 10)}${Math.floor(Math.random() * 100)}!`;
      const email = `${username}@${domainName}`;
      
      helpers.log(`Criando conta com email: ${email}`);
      
      try {
        await axios.post(`${this.baseUrl}/accounts`, {
          address: email,
          password: password
        }, {
          timeout: 30000
        });
      } catch (registerError) {
        console.error('Erro ao registrar conta:', registerError);
        
        let errorDetails = 'Erro desconhecido';
        if (registerError.response) {
          errorDetails = `Status: ${registerError.response.status}, Mensagem: ${JSON.stringify(registerError.response.data || {})}`;
        } else if (registerError.request) {
          errorDetails = 'Sem resposta do servidor';
        } else {
          errorDetails = registerError.message;
        }
        
        throw new Error(`Falha ao registrar conta de email: ${errorDetails}`);
      }
      
      helpers.log('Obtendo token de acesso...');
      
      let loginResponse;
      try {
        loginResponse = await axios.post(`${this.baseUrl}/token`, {
          address: email,
          password: password
        }, {
          timeout: 30000
        });
      } catch (loginError) {
        console.error('Erro ao fazer login:', loginError);
        
        let errorDetails = 'Erro desconhecido';
        if (loginError.response) {
          errorDetails = `Status: ${loginError.response.status}, Mensagem: ${JSON.stringify(loginError.response.data || {})}`;
        } else if (loginError.request) {
          errorDetails = 'Sem resposta do servidor';
        } else {
          errorDetails = loginError.message;
        }
        
        throw new Error(`Falha ao obter token de acesso: ${errorDetails}`);
      }
      
      if (!loginResponse.data || !loginResponse.data.token) {
        throw new Error('Token de acesso não encontrado na resposta do servidor');
      }
      
      this.account = { email, password };
      this.token = loginResponse.data.token;
      
      helpers.log(`Email temporário criado com sucesso: ${email}`, 'success');
      return this.account;
    } catch (error) {
      console.error('Erro fatal ao criar email temporário:', error);
      helpers.log(`Erro ao criar email temporário: ${error.message}`, 'error');
      throw error; 
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
          headers: { 'Authorization': `Bearer ${this.token}` },
          timeout: 30000
        });
        
        const messages = response.data["hydra:member"] || [];
        
        if (messages && messages.length > 0) {
          helpers.log(`${messages.length} email(s) encontrado(s)!`, 'success');
          return messages;
        }
        
        await helpers.delay(delaySeconds * 1000);
      } catch (error) {
        const errorMessage = error.response ? 
          `Erro ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
          error.message;
        
        helpers.log('Erro ao verificar emails: ' + errorMessage, 'warn');
        
        if (error.response && error.response.status === 401) {
          try {
            helpers.log('Token expirado, tentando renovar...', 'warn');
            const loginResponse = await axios.post(`${this.baseUrl}/token`, {
              address: this.account.email,
              password: this.account.password
            });
            
            if (loginResponse.data && loginResponse.data.token) {
              this.token = loginResponse.data.token;
              helpers.log('Token renovado com sucesso', 'success');
            }
          } catch (loginError) {
            helpers.log('Falha ao renovar token: ' + loginError.message, 'error');
          }
        }
        
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
        headers: { 'Authorization': `Bearer ${this.token}` },
        timeout: 30000
      });
      
      if (!response.data) {
        throw new Error('Resposta inválida ao obter detalhes do email');
      }
      
      const messageData = response.data;
      
      helpers.log(`Email recebido: "${messageData.subject}"`);
      
      return {
        id: messageData.id,
        h_mail: messageData.id,
        body: messageData.text || '',
        html: messageData.html && messageData.html.length > 0 ? messageData.html[0] : '',
        htmlEmbedded: messageData.html && messageData.html.length > 0 ? messageData.html.join('\n') : '',
        from: messageData.from ? messageData.from.address : '',
        to: messageData.to && messageData.to.length > 0 ? messageData.to[0].address : '',
        subject: messageData.subject || ''
      };
    } catch (error) {
      const errorMessage = error.response ? 
        `Erro ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message;
      
      helpers.log(`Erro ao obter detalhes da mensagem ${messageId}: ${errorMessage}`, 'error');
      throw error;
    }
  }
}

module.exports = TempMailService2;
