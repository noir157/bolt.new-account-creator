const puppeteer = require('puppeteer');
const TempEmailService = require('./services/TempEmailService');
const EmailParser = require('./services/EmailParser');
const helpers = require('./utils/helpers');

class AccountManager {
    constructor() {
    this.emailService = new TempEmailService();
    this.headless = false; 
    this.isRunning = false;
  }
  
    async fillRegistrationForm(page, credentials) {
    try {
      helpers.log('Preenchendo campo de email...');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });
      await helpers.randomDelay(300, 600);
      await page.type('input[name="email"]', credentials.email, { delay: 30 + Math.random() * 50 });

      helpers.log('Preenchendo campo de usuário...');
      await helpers.randomDelay(200, 500);
      await page.waitForSelector('input[name="username"]', { timeout: 30000 });
      await page.type('input[name="username"]', credentials.username, { delay: 30 + Math.random() * 50 });

      helpers.log('Preenchendo campo de senha...');
      await helpers.randomDelay(200, 500);
      await page.waitForSelector('input[name="password"]', { timeout: 30000 });
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
      throw new Error(`Falha ao preencher formulário: ${error.message}`);
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
      throw new Error(`Falha ao submeter formulário: ${error.message}`);
    }
  }

    async extractConfirmationLink(messages) {
    let confirmationLink = null;

    
    for (const message of messages) {
      if (EmailParser.isConfirmationEmail(message)) {
        helpers.log(`Email de confirmação encontrado: "${message.subject}"`, 'success');
        
        try {
          
          const messageDetails = await this.emailService.getMessageDetails(message.h_mail);
          
          confirmationLink = EmailParser.extractConfirmationLink(messageDetails);
          
          if (confirmationLink) {
            helpers.log(`Link de confirmação extraído: ${confirmationLink}`, 'success');
            return confirmationLink;
          } else {
            helpers.log('Não foi possível extrair link de confirmação deste email', 'warn');
          }
        } catch (emailError) {
          helpers.log(`Erro ao processar email ${message.h_mail}: ${emailError.message}`, 'error');
        }
      }
    }

    
    if (!confirmationLink) {
      helpers.log('Tentando abordagem alternativa para extrair link...', 'warn');
      
      
      for (const message of messages) {
        try {
          const messageDetails = await this.emailService.getMessageDetails(message.h_mail);

          
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
  
    async createAndConfirmAccount(options = {}) {
    
    if (this.isRunning) {
      return {
        success: false,
        error: "Uma automação já está em execução"
      };
    }
    
    this.isRunning = true;
    let browser = null;
    
    try {
      helpers.log('Iniciando processo de criação de conta', 'info');
      
      
      const emailAccount = await this.emailService.createAccount();
      
      if (!emailAccount || !emailAccount.email) {
        throw new Error('Falha ao criar conta de email temporário');
      }
      
      
      const accountCredentials = {
        email: emailAccount.email,
        username: helpers.generateUsername(),
        password: helpers.generatePassword()
      };
      
      helpers.log(`Credenciais geradas - Email: ${accountCredentials.email}`, 'info');
      
      
      const useHeadless = options.headless !== undefined ? options.headless : this.headless;
      
      helpers.log(`Iniciando navegador em modo ${useHeadless ? 'headless' : 'visível'}...`, 'info');
      
      
      const puppeteerVersion = parseInt(process.env.PUPPETEER_VERSION || '0');
      
      
      const launchOptions = {
        defaultViewport: null,
        args: [
          '--window-size=1366,768', 
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-gl-drawing-for-tests',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer'
        ],
        timeout: 60000
      };
      
      
      if (puppeteerVersion >= 19) {
        launchOptions.headless = useHeadless ? 'new' : false;
      } else {
        launchOptions.headless = useHeadless;
      }
      
      
      browser = await puppeteer.launch(launchOptions);
      
      if (!browser) {
        throw new Error('Falha ao iniciar o navegador');
      }
      
      helpers.log('Navegador iniciado com sucesso', 'success');
      
      
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(90000); 
      
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      
      helpers.log('Navegando para a página de registro...', 'info');
      
      try {
        await page.goto('https://stackblitz.com/register?redirect_to=%2Foauth%2Fauthorize%3Fclient_id%3Dbolt%26response_type%3Dcode%26redirect_uri%3Dhttps%253A%252F%252Fbolt.new%252Foauth2%26code_challenge_method%3DS256%26code_challenge%3DRc2A151QeNhkB4IckBA21EuKQatoLNeC5r2-IHWXliA%26state%3Dea7c7acf-1162-4fa5-bafd-cd9c9c0f9ad8%26scope%3Dpublic%26rid%3Dkfq4q8', {
          waitUntil: 'networkidle2',
          timeout: 90000
        });
        
        helpers.log('Página de registro carregada com sucesso', 'success');
      } catch (navError) {
        helpers.log(`Erro ao navegar para a página: ${navError.message}`, 'error');
        throw new Error(`Falha ao navegar para a página de registro: ${navError.message}`);
      }
      
      
      helpers.log('Preenchendo formulário de registro...', 'info');
      await this.fillRegistrationForm(page, accountCredentials);
      helpers.log('Formulário preenchido com sucesso', 'success');
      
      
      helpers.log('Enviando formulário...', 'info');
      await this.submitRegistrationForm(page);
      helpers.log('Formulário enviado com sucesso', 'success');
      
      
      helpers.log('Aguardando processamento do registro...', 'info');
      await helpers.delay(5000);
      
      
      helpers.log('Aguardando email de confirmação...', 'info');
      const messages = await this.emailService.checkInbox(30, 5);
      
      if (!messages || messages.length === 0) {
        helpers.log('Nenhum email recebido após o tempo limite', 'error');
        throw new Error('Nenhum email recebido após o tempo limite');
      }
      
      helpers.log(`${messages.length} email(s) recebido(s)`, 'success');
      
      
      helpers.log('Buscando link de confirmação nos emails...', 'info');
      const confirmationLink = await this.extractConfirmationLink(messages);
      
      if (!confirmationLink) {
        helpers.log('Link de confirmação não encontrado', 'error');
        throw new Error('Não foi possível extrair o link de confirmação dos emails recebidos');
      }
      
      helpers.log(`Link de confirmação encontrado: ${confirmationLink}`, 'success');
      
      
      helpers.log('Navegando para o link de confirmação...', 'info');
      
      try {
        await page.goto(confirmationLink, {
          waitUntil: 'networkidle2',
          timeout: 90000
        });
        
        helpers.log('Página de confirmação carregada com sucesso', 'success');
      } catch (confirmError) {
        helpers.log(`Erro ao navegar para o link de confirmação: ${confirmError.message}`, 'error');
        throw new Error(`Falha ao navegar para o link de confirmação: ${confirmError.message}`);
      }
      
      helpers.log('Aguardando processamento da confirmação...', 'info');
      await helpers.delay(5000);
      
      
      const accountInfo = {
        date: new Date().toISOString(),
        email: accountCredentials.email,
        username: accountCredentials.username,
        password: accountCredentials.password,
        confirmationLink: confirmationLink,
        confirmed: true,
        finalUrl: page.url()
      };
      
      helpers.log('CONTA CRIADA E CONFIRMADA COM SUCESSO!', 'success');
      
      return {
        success: true,
        accountInfo
      };
      
    } catch (error) {
      helpers.log(`Erro durante o processo: ${error.message}`, 'error');
      
      
      return {
        success: false,
        error: error.message,
        partialInfo: this.emailService && this.emailService.account ? {
          email: this.emailService.account.email,
          date: new Date().toISOString()
        } : null
      };
    } finally {
      
      this.isRunning = false;
      
      
      if (browser) {
        try {
          helpers.log('Fechando navegador...', 'info');
          await browser.close();
          helpers.log('Navegador fechado', 'info');
        } catch (closeError) {
          helpers.log(`Erro ao fechar navegador: ${closeError.message}`, 'warn');
        }
      }
    }
  }
}

module.exports = AccountManager;