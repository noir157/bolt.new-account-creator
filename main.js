const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const AccountManager = require('./src/AccountManager');
const helpers = require('./src/utils/helpers');


app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');


let mainWindow;

function createWindow() {
  
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/images/logo.svg')
  });

  
  mainWindow.loadFile('index.html');

  
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}


app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


ipcMain.handle('start-automation', async (event, options = {}) => {
  try {
    console.log('='.repeat(60));
    console.log('INICIANDO AUTOMAÇÃO DE CRIAÇÃO DE CONTA BOLT.NEW');
    console.log('Opções recebidas:', options);
    console.log('='.repeat(60));
    
    
    const accountManager = new AccountManager();
    
    
    accountManager.headless = options.headless === true;
    
    console.log(`Modo headless configurado: ${accountManager.headless}`);
    
    
    const originalLog = helpers.log;
    helpers.log = function(message, type = 'info') {
      
      console.log(`[${new Date().toISOString().slice(11, 19)}] ${type.toUpperCase()}: ${message}`);
      
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-message', {
          message,
          type,
          timestamp: new Date().toISOString().slice(11, 19)
        });
      }
    };
    
    
    const progressSteps = [
      { message: 'Iniciando processo...', progress: 5 },
      { message: 'Criando email temporário...', progress: 15 },
      { message: 'Email criado com sucesso', progress: 25 },
      { message: 'Abrindo navegador...', progress: 35 },
      { message: 'Navegando para site...', progress: 45 },
      { message: 'Preenchendo formulário...', progress: 55 },
      { message: 'Enviando formulário...', progress: 65 },
      { message: 'Aguardando email de confirmação...', progress: 75 },
      { message: 'Email recebido, extraindo link...', progress: 85 },
      { message: 'Navegando para link de confirmação...', progress: 90 },
      { message: 'Confirmando conta...', progress: 95 },
      { message: 'Concluído com sucesso!', progress: 100 }
    ];
    
    let currentStep = 0;
    
    
    const sendProgress = () => {
      if (currentStep < progressSteps.length && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-progress', progressSteps[currentStep]);
        console.log(`Progresso enviado: ${progressSteps[currentStep].progress}% - ${progressSteps[currentStep].message}`);
        currentStep++;
      }
    };
    
    
    sendProgress();
    
    
    const originalCreateAccount = accountManager.emailService.createAccount;
    accountManager.emailService.createAccount = async function() {
      
      try {
        const result = await originalCreateAccount.apply(this, arguments);
        sendProgress(); 
        return result;
      } catch (error) {
        helpers.log(`Erro ao criar email: ${error.message}`, 'error');
        throw error;
      }
    };
    
    
    sendProgress();
    
    
    const result = await accountManager.createAndConfirmAccount(options);
    
    
    if (result && result.success) {
      
      while (currentStep < progressSteps.length) {
        sendProgress();
      }
      
      
      if (result.accountInfo) {
        
        console.log('Enviando dados da conta para o renderer:', result.accountInfo);
        
        
        mainWindow.webContents.send('automation-success', {
          success: true,
          accountInfo: {
            id: `acc_${Date.now()}`,
            email: result.accountInfo.email,
            username: result.accountInfo.username,
            password: result.accountInfo.password,
            date: result.accountInfo.date || new Date().toISOString(),
            confirmationLink: result.accountInfo.confirmationLink,
            confirmed: result.accountInfo.confirmed || true,
            finalUrl: result.accountInfo.finalUrl
          }
        });
      } else {
        console.error('Dados da conta ausentes no resultado:', result);
        mainWindow.webContents.send('automation-error', {
          error: 'Dados da conta não disponíveis',
          message: 'A conta foi criada, mas os detalhes não estão disponíveis'
        });
      }
    } else {
      const errorMessage = result && result.error ? result.error : 'Falha desconhecida na automação';
      mainWindow.webContents.send('automation-error', {
        error: errorMessage,
        message: `Falha na automação: ${errorMessage}`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Erro durante a automação:', error);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('automation-error', {
        error: error.message,
        message: `Erro durante a automação: ${error.message}`
      });
    }
    
    return { 
      success: false, 
      error: error.message 
    };
  }
});


ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('minimize-app', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-app', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});


try {
  const puppeteerPkg = require('puppeteer/package.json');
  process.env.PUPPETEER_VERSION = puppeteerPkg.version.split('.')[0];
  console.log(`Versão do Puppeteer detectada: ${puppeteerPkg.version}`);
} catch (e) {
  console.log('Não foi possível detectar a versão do Puppeteer:', e.message);
  process.env.PUPPETEER_VERSION = '0';
}


process.on('uncaughtException', (error) => {
  console.error('Exceção não capturada:', error);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', {
      message: `Erro crítico: ${error.message}`,
      type: 'error',
      timestamp: new Date().toISOString().slice(11, 19)
    });
  }
});


process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejeição de promessa não tratada:', reason);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', {
      message: `Promessa rejeitada: ${reason}`,
      type: 'error',
      timestamp: new Date().toISOString().slice(11, 19)
    });
  }
});