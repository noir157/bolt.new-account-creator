const axios = require('axios');
const helpers = require('../utils/helpers');

class TempEmailService {
  constructor() {
    this.baseUrl = 'https://api.temp-mail.solutions';
    this.account = null;
    this.token = null;
  }

  async createAccount() {
    try {
      helpers.log('Obtendo domínios disponíveis...');
      
      let domainsResponse;
      try {
        domainsResponse = await axios.get(`${this.baseUrl}/api/domain`, {
          timeout: 30000
        });
      } catch (axiosError) {
        console.error('Erro na requisição de domínios:', axiosError);
        throw new Error(`Falha ao obter domínios: ${axiosError.message || 'Erro de rede'}`);
      }
      
      if (!domainsResponse || !domainsResponse.data || !domainsResponse.data.data) {
        throw new Error('Resposta inválida da API de domínios');
      }
      
      const domains = domainsResponse.data.data;
      
      if (!Array.isArray(domains) || domains.length === 0) {
        throw new Error('Nenhum domínio disponível retornado pela API');
      }
      
      
      const activeDomains = domains.filter(domain => domain.active);
      
      if (activeDomains.length === 0) {
        throw new Error('Não há domínios ativos disponíveis');
      }
      
      
      const selectedDomain = activeDomains[Math.floor(Math.random() * activeDomains.length)];
      const domain = selectedDomain.domain;
      
      
      const username = `user${Math.floor(Math.random() * 100000)}${Date.now().toString().slice(-4)}`;
      const password = `Pass${Math.random().toString(36).substring(2, 10)}${Math.floor(Math.random() * 100)}!`;
      const email = `${username}@${domain}`;
      
      helpers.log(`Criando conta com email: ${email}`);
      
      
      try {
        await axios.post(`${this.baseUrl}/api/register`, {
          username: username,
          domain: domain,
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
        loginResponse = await axios.post(`${this.baseUrl}/api/login`, {
          email: email,
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
      
      if (!loginResponse.data || !loginResponse.data.data || !loginResponse.data.data.access_token) {
        throw new Error('Token de acesso não encontrado na resposta do servidor');
      }
      
      this.account = { email, password };
      this.token = loginResponse.data.data.access_token;
      
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
        const response = await axios.get(`${this.baseUrl}/api/mail`, {
          headers: { 'Authorization': `Bearer ${this.token}` },
          timeout: 30000
        });
        
        const messages = response.data.data || [];
        
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
            const loginResponse = await axios.post(`${this.baseUrl}/api/login`, {
              email: this.account.email,
              password: this.account.password
            });
            
            if (loginResponse.data.data && loginResponse.data.data.access_token) {
              this.token = loginResponse.data.data.access_token;
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
  
  async getMessageDetails(h_mail) {
    if (!this.token) {
      throw new Error('É necessário criar uma conta antes de ler mensagens');
    }
    
    try {
      helpers.log(`Obtendo detalhes da mensagem ${h_mail}...`);
      const response = await axios.get(`${this.baseUrl}/api/mail/${h_mail}`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
        timeout: 30000
      });
      
      if (!response.data.data) {
        throw new Error('Resposta inválida ao obter detalhes do email');
      }
      
      const messageData = response.data.data;
      
      helpers.log(`Email recebido: "${messageData.subject}"`);
      
      
      return {
        id: messageData.id,
        h_mail: messageData.h_mail,
        body: messageData.body,
        html: messageData.html,
        htmlEmbedded: messageData.htmlEmbedded,
        from: messageData.from,
        to: messageData.to,
        subject: messageData.subject
      };
    } catch (error) {
      const errorMessage = error.response ? 
        `Erro ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message;
      
      helpers.log(`Erro ao obter detalhes da mensagem ${h_mail}: ${errorMessage}`, 'error');
      throw error;
    }
  }
}

module.exports = TempEmailService;