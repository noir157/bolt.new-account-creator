const helpers = require('../utils/helpers');

class EmailParser {
  static extractConfirmationLink(emailData) {
    let bodyText = '';
    
    if (typeof emailData === 'string') {
      bodyText = emailData;
      helpers.log('Corpo do email recebido como string');
    } 
    else if (emailData && typeof emailData === 'object') {
      helpers.log('Corpo do email recebido como objeto');
      
      if (emailData.html) {
        bodyText = emailData.html;
        helpers.log('Usando corpo HTML do email');
      } else if (emailData.htmlEmbedded) {
        bodyText = emailData.htmlEmbedded;
        helpers.log('Usando corpo HTML incorporado do email');
      } else if (emailData.body) {
        bodyText = emailData.body;
        helpers.log('Usando propriedade body do email');
      } else {
        for (const key in emailData) {
          const value = emailData[key];
          if (typeof value === 'string' && 
              (value.includes('http') || value.includes('href') || value.includes('<a'))) {
            bodyText = value;
            helpers.log(`Usando propriedade ${key} que parece conter links`);
            break;
          }
        }
        
        if (!bodyText) {
          try {
            bodyText = JSON.stringify(emailData);
            helpers.log('Convertendo objeto completo para string');
          } catch (e) {
            helpers.log('Falha ao converter objeto para string: ' + e.message, 'warn');
          }
        }
      }
    } else {
      helpers.log('Corpo do email em formato não reconhecido: ' + typeof emailData, 'error');
      return null;
    }

    if (!bodyText) {
      helpers.log('Não foi possível extrair texto do corpo do email', 'error');
      return null;
    }
    
    if (typeof bodyText !== 'string') {
      try {
        bodyText = String(bodyText);
      } catch (e) {
        helpers.log('Falha ao converter corpo do email para string: ' + e.message, 'error');
        return null;
      }
    }
    
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    const urls = bodyText.match(urlRegex) || [];
    
    helpers.log(`Encontrados ${urls.length} URLs no corpo do email`);
    
    const confirmationKeywords = ['confirm', 'verify', 'activate', 'validation'];
    
    for (const keyword of confirmationKeywords) {
      const confirmationUrls = urls.filter(url => url.toLowerCase().includes(keyword));
      if (confirmationUrls.length > 0) {
        helpers.log(`URL de confirmação encontrado com a palavra-chave "${keyword}": ${confirmationUrls[0]}`, 'success');
        return confirmationUrls[0];
      }
    }
    
    if (urls.length > 0) {
      helpers.log(`Nenhum URL específico de confirmação encontrado. Usando o primeiro URL: ${urls[0]}`);
      return urls[0];
    }
    
    helpers.log('Nenhum URL encontrado no corpo do email', 'warn');
    return null;
  }
  
  static isConfirmationEmail(message) {
    if (!message || !message.subject) {
      helpers.log('Mensagem ou assunto inexistente', 'warn');
      return false;
    }
    
    const subject = message.subject.toLowerCase();
    const confirmationKeywords = ['confirm', 'verify', 'activate', 'welcome', 'registration', 'instruction'];
    
    const isConfirmation = confirmationKeywords.some(keyword => subject.includes(keyword));
    helpers.log(`Verificando email "${message.subject}": ${isConfirmation ? 'Parece ser de confirmação' : 'Não parece ser de confirmação'}`);
    
    return isConfirmation;
  }
}

module.exports = EmailParser;