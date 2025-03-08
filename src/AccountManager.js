const puppeteer = require('puppeteer');
const path = require('path');
const TempEmailService = require('./services/TempEmailService');
const EmailParser = require('./services/EmailParser');
const helpers = require('./utils/helpers');

class AccountManager {
  constructor(outputDir = './bolt_account_result') {
    this.outputDir = outputDir;
    this.emailService = new TempEmailService();
    helpers.ensureDirectoryExists(outputDir);
  }
  
  async fillRegistrationForm(page, credentials) {
    try {
      helpers.log('Preenchendo campo de email...');
      await page.waitForSelector('input[name="email"]');
      await helpers.randomDelay(300, 600);
      await page.type('input[name="email"]', credentials.email, { delay: 30 + Math.random() * 50 });

      helpers.log('Preenchendo campo de usuário...');
      await helpers.randomDelay(200, 500);
      await page.waitForSelector('input[name="username"]');
      await page.type('input[name="username"]', credentials.username, { delay: 30 + Math.random() * 50 });

      helpers.log('Preenchendo campo de senha...');
      await helpers.randomDelay(200, 500);
      await page.waitForSelector('input[name="password"]');
      await page.type('input[name="password"]', credentials.password, { delay: 30 + Math.random() * 50 });

      helpers.log('Preenchendo campo de confirmação de senha...');
      await helpers.randomDelay(200, 500);
      
      const confirmationSelectors = [
        'input[name="passwordConfirmation"]',
        'input[name="password_confirmation"]',
        'input[name="confirmPassword"]',
        'input[name="confirm_password"]'
      ];
      
      let confirmationFilled = false;
      
      for (const selector of confirmationSelectors) {
        try {
          const confirmField = await page.$(selector);
          if (confirmField) {
            await page.type(selector, credentials.password, { delay: 30 + Math.random() * 50 });
            confirmationFilled = true;
            helpers.log(`Campo de confirmação de senha preenchido usando seletor: ${selector}`, 'success');
            break;
          }
        } catch (e) {

        }
      }
      
      if (!confirmationFilled) {
        const passwordFields = await page.$$('input[type="password"]');
        if (passwordFields.length >= 2) {
          await passwordFields[1].type(credentials.password, { delay: 30 + Math.random() * 50 });
          confirmationFilled = true;
          helpers.log('Campo de confirmação de senha preenchido (segundo campo de senha)', 'success');
        } else {
          helpers.log('Não foi possível identificar o campo de confirmação de senha', 'warn');
        }
      }
      
      helpers.log('Verificando termos e condições...');
      await helpers.randomDelay(300, 700);
      try {
        const termsCheckbox = await page.$('input[type="checkbox"]');
        if (termsCheckbox) {
          await termsCheckbox.click();
          helpers.log('Termos aceitos', 'success');
        }
      } catch (error) {
        helpers.log('Não foi possível localizar checkbox de termos', 'warn');
      }
      
      return true;
    } catch (error) {
      helpers.log('Erro ao preencher formulário: ' + error.message, 'error');
      return false;
    }
  }
  
  async submitRegistrationForm(page) {
    try {
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button.submit-button',
        'button:contains("Sign up")',
        'button:contains("Register")'
      ];
      
      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await helpers.randomDelay(500, 1000);
            await button.click();
            helpers.log(`Formulário enviado usando seletor: ${selector}`, 'success');
            return true;
          }
        } catch (e) {

        }
      }
      
      helpers.log('Tentando enviar formulário com a tecla Enter...');
      await helpers.randomDelay(300, 700);
      await page.keyboard.press('Enter');
      helpers.log('Formulário enviado usando tecla Enter', 'success');
      
      return true;
    } catch (error) {
      helpers.log('Erro ao submeter formulário: ' + error.message, 'error');
      return false;
    }
  }

  async extractConfirmationLink(messages) {
    let confirmationLink = null;

    for (const message of messages) {
      if (EmailParser.isConfirmationEmail(message)) {
        helpers.log(`Email de confirmação encontrado: "${message.subject}"`, 'success');
        
        try {
          const messageDetails = await this.emailService.getMessageDetails(message.id);
          
          confirmationLink = EmailParser.extractConfirmationLink(messageDetails);
          
          if (confirmationLink) {
            helpers.log(`Link de confirmação extraído: ${confirmationLink}`, 'success');
            return confirmationLink;
          } else {
            helpers.log('Não foi possível extrair link de confirmação deste email', 'warn');
          }
        } catch (emailError) {
          helpers.log(`Erro ao processar email ${message.id}: ${emailError.message}`, 'error');
        }
      }
    }

    if (!confirmationLink) {
      helpers.log('Tentando abordagem alternativa para extrair link...', 'warn');
      
      for (const message of messages) {
        try {
          const messageDetails = await this.emailService.getMessageDetails(message.id);

          const rawContent = JSON.stringify(messageDetails);
          const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
          const allUrls = rawContent.match(urlRegex) || [];
          
          if (allUrls.length > 0) {
            helpers.log(`Encontrados ${allUrls.length} URLs no conteúdo bruto do email`);
            

            for (const url of allUrls) {
              if (url.includes('confirm') || url.includes('verify') || url.includes('activate')) {
                confirmationLink = url;
                helpers.log(`Link de confirmação encontrado (método alternativo): ${confirmationLink}`, 'success');
                return confirmationLink;
              }
            }
            
       
            if (!confirmationLink && allUrls.length > 0) {
              confirmationLink = allUrls[0];
              helpers.log(`Usando primeiro URL encontrado: ${confirmationLink}`, 'warn');
              return confirmationLink;
            }
          }
        } catch (e) {
          helpers.log('Erro na extração alternativa: ' + e.message, 'error');
        }
      }
    }
    
    return null;
  }
  
  saveAccountInfo(accountInfo) {
    const accountInfoText = 
      `Data: ${accountInfo.date}\n` +
      `Email: ${accountInfo.email}\n` +
      `Username: ${accountInfo.username}\n` +
      `Password: ${accountInfo.password}\n` +
      `Link de confirmação: ${accountInfo.confirmationLink}\n` +
      `Status: ${accountInfo.confirmed ? 'Confirmado' : 'Não confirmado'}\n` +
      `URL final: ${accountInfo.finalUrl}\n` +
      `------------------------\n`;
    
    const infoFilePath = path.join(this.outputDir, 'confirmed_account.txt');
    const jsonFilePath = path.join(this.outputDir, 'confirmed_account.json');
    
    helpers.saveToFile(infoFilePath, accountInfoText);
    helpers.saveToFile(jsonFilePath, JSON.stringify(accountInfo, null, 2));
    
    helpers.log('Informações da conta confirmada salvas em:', 'success');
    helpers.log(`   - ${path.resolve(infoFilePath)}`);
    
    return {
      textFile: infoFilePath,
      jsonFile: jsonFilePath
    };
  }
  
  async createAndConfirmAccount() {
    console.log('='.repeat(60));
    console.log('INICIANDO PROCESSO DE CRIAÇÃO E CONFIRMAÇÃO DE CONTA NO BOLT.NEW');
    console.log('='.repeat(60));
    
    let browser = null;
    
    try {
      const emailAccount = await this.emailService.createAccount();
      
      const accountCredentials = {
        email: emailAccount.email,
        username: helpers.generateUsername(),
        password: helpers.generatePassword()
      };
      
      console.log('Credenciais geradas:');
      console.log(`- Email: ${accountCredentials.email}`);
      console.log(`- Username: ${accountCredentials.username}`);
      console.log(`- Password: ${accountCredentials.password}`);
      console.log('-'.repeat(60));
      
      helpers.log('Iniciando navegador...');
      browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--window-size=1366,768']
      });
      
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      console.log('\nFASE 1: REGISTRO DA CONTA');
      console.log('-'.repeat(40));
      
      helpers.log('Navegando para a página de registro...');
      await page.goto('https://stackblitz.com/register?redirect_to=/oauth/authorize?client_id=bolt&response_type=code&redirect_uri=https%3A%2F%2Fbolt.new%2Foauth2&code_challenge_method=S256&code_challenge=ARGuTD1lpTZHCQWoHSbB5FkpFaQw2xXeUBWdIEW46uU&state=f0d2aaed-3c6d-4cf2-b0d7-1473411ffe4e&scope=public', { waitUntil: 'networkidle2' });
      
      helpers.log('Preenchendo formulário...');
      await this.fillRegistrationForm(page, accountCredentials);
      
      helpers.log('Enviando formulário...');
      await this.submitRegistrationForm(page);

      helpers.log('Aguardando processamento...');
      await helpers.delay(5000);
      
      const timestamp = helpers.getTimestamp();
      const registrationScreenshot = path.join(this.outputDir, `registration_${timestamp}.png`);
      await page.screenshot({ path: registrationScreenshot, fullPage: true });
      helpers.log(`Screenshot do registro salvo em: ${registrationScreenshot}`, 'success');
      
      console.log('\nFASE 2: VERIFICAÇÃO DE EMAIL');
      console.log('-'.repeat(40));
      
      helpers.log('Aguardando email de confirmação...');
      const messages = await this.emailService.checkInbox();
      
      if (messages.length === 0) {
        throw new Error('Nenhum email recebido após o tempo limite');
      }
      
      const confirmationLink = await this.extractConfirmationLink(messages);
      
      if (!confirmationLink) {
        throw new Error('Não foi possível extrair o link de confirmação dos emails recebidos');
      }

      console.log('\nFASE 3: CONFIRMAÇÃO DA CONTA');
      console.log('-'.repeat(40));
      
      helpers.log('Navegando para o link de confirmação...');
      await page.goto(confirmationLink, { waitUntil: 'networkidle2' });
      
      helpers.log('Aguardando processamento da confirmação...');
      await helpers.delay(5000);
      
      const confirmationScreenshot = path.join(this.outputDir, `confirmation_${timestamp}.png`);
      await page.screenshot({ path: confirmationScreenshot, fullPage: true });
      helpers.log(`Screenshot da confirmação salvo em: ${confirmationScreenshot}`, 'success');
      
      const accountInfo = {
        date: new Date().toISOString(),
        email: accountCredentials.email,
        username: accountCredentials.username,
        password: accountCredentials.password,
        confirmationLink: confirmationLink,
        confirmed: true,
        finalUrl: page.url()
      };
      
      const savedFiles = this.saveAccountInfo(accountInfo);
      
      helpers.log('CONTA CRIADA E CONFIRMADA COM SUCESSO!', 'success');
      
      return {
        success: true,
        accountInfo,
        screenshots: {
          registration: registrationScreenshot,
          confirmation: confirmationScreenshot
        },
        savedFiles
      };
      
    } catch (error) {
      helpers.log(`Erro durante o processo: ${error.message}`, 'error');
      
      if (browser) {
        try {
          const pages = await browser.pages();
          if (pages.length > 0) {
            const errorScreenshotPath = path.join(this.outputDir, `error_${helpers.getTimestamp()}.png`);
            await pages[0].screenshot({ path: errorScreenshotPath, fullPage: true });
            helpers.log(`Screenshot de erro salvo em: ${errorScreenshotPath}`);
          }
        } catch (screenshotError) {
          helpers.log('Não foi possível capturar screenshot de erro: ' + screenshotError.message, 'error');
        }
      }
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (browser) {
        helpers.log('Fechando navegador...');
        await browser.close();
        helpers.log('Navegador fechado');
      }
    }
  }
}

module.exports = AccountManager;