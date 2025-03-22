
const { ipcRenderer } = require('electron');


let appState = {
  running: false,
  currentProgress: 0,
  accounts: [],
  settings: {
    headlessMode: false,
    maxRetries: 3
  },
  darkMode: false,
  expandedAccountId: null 
};


let lastLogMessage = null;
let lastLogType = null;
let lastLogTimestamp = null;
let duplicateCount = 0;
let logSystemInitialized = false;


document.addEventListener('DOMContentLoaded', () => {
  
  const closeBtn = document.getElementById('close-btn');
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');

  
  const navItems = document.querySelectorAll('.nav-item');
  const contentViews = document.querySelectorAll('.content-view');

  
  const startBtn = document.getElementById('start-btn');
  const statusText = document.getElementById('status-text');
  const statusDescription = document.getElementById('status-description');
  const progressBar = document.getElementById('progress-bar');
  const statusIcon = document.getElementById('status-icon');

  
  const logContainer = document.getElementById('log-container');
  const clearLogBtn = document.getElementById('clear-log-btn');

  
  const accountsList = document.getElementById('accounts-list');
  const createFirstAccountBtn = document.getElementById('create-first-account-btn');
  const exportAccountsBtn = document.getElementById('export-accounts-btn');

  
  const headlessModeToggle = document.getElementById('headless-mode');
  const maxRetriesInput = document.getElementById('max-retries');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  
  const resultModal = document.getElementById('result-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const resultEmail = document.getElementById('result-email');
  const resultUsername = document.getElementById('result-username');
  const resultPassword = document.getElementById('result-password');
  const saveAccountBtn = document.getElementById('save-account-btn');

  
  function initializeLogSystem() {
    if (logSystemInitialized) return;
    
    
    ipcRenderer.removeAllListeners('log-message');
    
    
    ipcRenderer.on('log-message', (event, data) => {
      addLogEntry(data.message, data.type, data.timestamp);
    });
    
    logSystemInitialized = true;
    console.log('Sistema de log inicializado');
  }

  
  function setRunningState(isRunning) {
    appState.running = isRunning;
    startBtn.disabled = isRunning;

    if (isRunning) {
      startBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg> Parar';
      statusIcon.className = 'status-icon running';
      statusIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>';
    } else {
      startBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Iniciar Automação';
    }
  }

  
  function updateProgress(data) {
    if (!data) return;
    
    
    if (data.progress !== undefined) {
      progressBar.style.width = `${data.progress}%`;
      appState.currentProgress = data.progress;
      
      
      progressBar.classList.add('progress-updating');
      setTimeout(() => {
        progressBar.classList.remove('progress-updating');
      }, 300);
    }

    if (data.message) {
      statusText.textContent = data.message;
      statusDescription.textContent = data.message;
      
      
      if (data.progress < 25) {
        statusIcon.className = 'status-icon pending';
      } else if (data.progress < 100) {
        statusIcon.className = 'status-icon running';
      } else if (data.progress === 100) {
        statusIcon.className = 'status-icon success';
        statusIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      }
    }
    
    console.log(`Progresso atualizado: ${data.progress}% - ${data.message}`);
  }

  
  function addLogEntry(message, type = 'info', timestamp = null) {
    if (!timestamp) {
      timestamp = new Date().toISOString().slice(11, 19);
    }

    
    if (message === lastLogMessage && type === lastLogType && 
        (new Date(timestamp) - new Date(lastLogTimestamp) < 1000)) {
      duplicateCount++;
      
      
      const lastEntry = logContainer.lastElementChild;
      if (lastEntry && lastEntry.classList.contains('log-entry')) {
        const countBadge = lastEntry.querySelector('.duplicate-count');
        if (countBadge) {
          countBadge.textContent = `(${duplicateCount + 1}x)`;
          countBadge.style.display = 'inline';
        } else {
          const messageElem = lastEntry.querySelector('.log-message');
          if (messageElem) {
            const badge = document.createElement('span');
            badge.className = 'duplicate-count';
            badge.textContent = `(${duplicateCount + 1}x)`;
            badge.style.marginLeft = '5px';
            messageElem.appendChild(badge);
          }
        }
        
        
        const timeElem = lastEntry.querySelector('.log-time');
        if (timeElem) {
          timeElem.textContent = timestamp;
        }
        
        return;
      }
    } else {
      
      duplicateCount = 0;
    }

    
    lastLogMessage = message;
    lastLogType = type;
    lastLogTimestamp = timestamp;

    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;

    const typeLabels = {
      'info': 'INFO',
      'success': 'SUCCESS',
      'warn': 'WARNING',
      'error': 'ERROR'
    };

    logEntry.innerHTML = `
      <span class="log-time">${timestamp}</span>
      <span class="log-badge">${typeLabels[type] || 'INFO'}</span>
      <span class="log-message">${message}</span>
    `;

    
    logEntry.classList.add('log-entry-new');
    
    logContainer.appendChild(logEntry);
    
    
    logContainer.scrollTop = logContainer.scrollHeight;
    
    
    setTimeout(() => {
      if (logEntry.classList.contains('log-entry-new')) {
        logEntry.classList.remove('log-entry-new');
      }
    }, 500);
  }

  
  function clearLog() {
    logContainer.innerHTML = '';
    addLogEntry('Log limpo', 'info');
  }

  
  function showResultModal(accountInfo) {
    console.log('Exibindo modal com detalhes da conta:', accountInfo);
    
    
    if (!resultEmail || !resultUsername || !resultPassword || !resultModal) {
      console.error('Elementos do modal não encontrados:', {
        resultEmail: !!resultEmail,
        resultUsername: !!resultUsername,
        resultPassword: !!resultPassword,
        resultModal: !!resultModal
      });
      
      
      alert(`Conta criada com sucesso!\nEmail: ${accountInfo.email}\nUsername: ${accountInfo.username}\nPassword: ${accountInfo.password}`);
      return;
    }
    
    
    resultEmail.textContent = accountInfo.email || 'N/A';
    resultUsername.textContent = accountInfo.username || 'N/A';
    resultPassword.textContent = accountInfo.password || 'N/A';
    
    
    resultEmail.style.display = 'inline';
    resultUsername.style.display = 'inline';
    resultPassword.style.display = 'inline';
    
    
    resultModal.classList.add('active');
    
    
    console.log('Modal de resultado exibido com sucesso');
  }

  function addAccountToList(account) {
    
    if (!account.id) {
      account.id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    
    if (!appState.accounts.some(acc => acc.email === account.email)) {
      appState.accounts.unshift(account);
      saveAccounts();
    }

    renderAccountsList();
  }

  function renderAccountsList() {
    if (appState.accounts.length === 0) {
      accountsList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <p>Nenhuma conta criada ainda</p>
          <button class="primary-button" id="create-first-account-btn">
            Criar primeira conta
          </button>
        </div>
      `;

      document.getElementById('create-first-account-btn').addEventListener('click', () => {
        
        navItems.forEach(item => item.classList.remove('active'));
        contentViews.forEach(view => view.classList.remove('active'));

        document.querySelector('[data-view="dashboard"]').classList.add('active');
        document.getElementById('dashboard-view').classList.add('active');

        
        startAutomation();
      });

      return;
    }

    accountsList.innerHTML = '';

    appState.accounts.forEach(account => {
      const isExpanded = appState.expandedAccountId === account.id;
      const accountCard = document.createElement('div');
      accountCard.className = `account-card ${isExpanded ? 'expanded' : ''}`;
      accountCard.dataset.id = account.id;

      const date = new Date(account.date || account.createdAt || Date.now()).toLocaleString();
      const confirmationLink = account.confirmationLink || 'N/A';
      const finalUrl = account.finalUrl || 'N/A';

      
      const basicInfoHTML = `
        <div class="account-summary">
          <div class="account-info">
            <div class="account-main-info">
              <div class="account-username">${account.username}</div>
              <div class="account-credentials">
                <span class="account-email">${account.email}</span>
                <span class="account-password">Senha: ${account.password}</span>
              </div>
            </div>
            <div class="account-date">${date}</div>
          </div>
          <div class="account-actions">
            <button class="icon-button toggle-details" title="${isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}">
              <svg viewBox="0 0 24 24"><path d="${isExpanded ? 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z' : 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'}"/></svg>
            </button>
            <button class="icon-button copy-account" data-email="${account.email}" title="Copiar dados">
              <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>
            <button class="icon-button remove-account" data-email="${account.email}" title="Remover">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      `;

      
      const detailsHTML = `
        <div class="account-details ${isExpanded ? 'visible' : ''}">
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Email:</span>
              <div class="detail-value-container">
                <span class="detail-value">${account.email}</span>
                <button class="copy-inline-btn" data-value="${account.email}">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-label">Usuário:</span>
              <div class="detail-value-container">
                <span class="detail-value">${account.username}</span>
                <button class="copy-inline-btn" data-value="${account.username}">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-label">Senha:</span>
              <div class="detail-value-container">
                <span class="detail-value">${account.password}</span>
                <button class="copy-inline-btn" data-value="${account.password}">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-label">Data:</span>
              <span class="detail-value">${date}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="detail-value">${account.confirmed ? 'Confirmada' : 'Não confirmada'}</span>
            </div>
            <div class="detail-item full-width">
              <span class="detail-label">Link de confirmação:</span>
              <div class="detail-value-container">
                <span class="detail-value detail-url">${confirmationLink}</span>
                <button class="copy-inline-btn" data-value="${confirmationLink}">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </div>
            </div>
            <div class="detail-item full-width">
              <span class="detail-label">URL final:</span>
              <div class="detail-value-container">
                <span class="detail-value detail-url">${finalUrl}</span>
                <button class="copy-inline-btn" data-value="${finalUrl}">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </div>
            </div>
          </div>
          
          <div class="account-actions-expanded">
            <button class="primary-button export-account-btn" data-id="${account.id}">
              <svg viewBox="0 0 24 24"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>
              Exportar
            </button>
          </div>
        </div>
      `;

      accountCard.innerHTML = basicInfoHTML + detailsHTML;
      accountsList.appendChild(accountCard);
    });

    
    setupAccountListeners();
  }

  function setupAccountListeners() {
    
    document.querySelectorAll('.toggle-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const accountCard = e.currentTarget.closest('.account-card');
        const accountId = accountCard.dataset.id;

        
        if (appState.expandedAccountId === accountId) {
          appState.expandedAccountId = null;
          accountCard.classList.remove('expanded');
          accountCard.querySelector('.account-details').classList.remove('visible');
          e.currentTarget.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';
          e.currentTarget.title = 'Expandir detalhes';
        } else {
          
          if (appState.expandedAccountId) {
            const previousCard = document.querySelector(`.account-card[data-id="${appState.expandedAccountId}"]`);
            if (previousCard) {
              previousCard.classList.remove('expanded');
              previousCard.querySelector('.account-details').classList.remove('visible');
              previousCard.querySelector('.toggle-details').innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';
              previousCard.querySelector('.toggle-details').title = 'Expandir detalhes';
            }
          }

          appState.expandedAccountId = accountId;
          accountCard.classList.add('expanded');
          accountCard.querySelector('.account-details').classList.add('visible');
          e.currentTarget.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
          e.currentTarget.title = 'Recolher detalhes';
        }
      });
    });

    
    document.querySelectorAll('.account-summary').forEach(summary => {
      summary.addEventListener('click', (e) => {
        
        if (e.target.closest('.account-actions')) return;

        const accountCard = summary.closest('.account-card');
        const toggleBtn = accountCard.querySelector('.toggle-details');
        toggleBtn.click(); 
      });
    });

    
    document.querySelectorAll('.copy-account').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const email = e.currentTarget.getAttribute('data-email');
        const account = appState.accounts.find(acc => acc.email === email);

        if (account) {
          const accountText = `Email: ${account.email}\nUsername: ${account.username}\nPassword: ${account.password}`;
          navigator.clipboard.writeText(accountText);

          
          const originalIcon = btn.innerHTML;
          btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

          setTimeout(() => {
            btn.innerHTML = originalIcon;
          }, 1500);

          showToast('Dados copiados para a área de transferência');
        }
      });
    });

    
    document.querySelectorAll('.remove-account').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const email = e.currentTarget.getAttribute('data-email');

        if (confirm(`Tem certeza que deseja remover a conta ${email}?`)) {
          appState.accounts = appState.accounts.filter(acc => acc.email !== email);
          saveAccounts();
          renderAccountsList();

          showToast('Conta removida com sucesso');
        }
      });
    });

    
    document.querySelectorAll('.copy-inline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const value = btn.getAttribute('data-value');
        navigator.clipboard.writeText(value);

        
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

        setTimeout(() => {
          btn.innerHTML = originalIcon;
        }, 1500);

        showToast('Copiado para a área de transferência');
      });
    });

    
    document.querySelectorAll('.export-account-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const accountId = btn.getAttribute('data-id');
        const account = appState.accounts.find(acc => acc.id === accountId);

        if (account) {
          exportSingleAccount(account);
        }
      });
    });
  }

  function exportSingleAccount(account) {
    const accountText =
      `=== DETALHES DA CONTA BOLT.NEW ===\n\n` +
      `Email: ${account.email}\n` +
      `Username: ${account.username}\n` +
      `Password: ${account.password}\n` +
      `Data: ${new Date(account.date || account.createdAt || Date.now()).toLocaleString()}\n` +
      `Status: ${account.confirmed ? 'Confirmada' : 'Não confirmada'}\n` +
      `Link de confirmação: ${account.confirmationLink || 'N/A'}\n` +
      `URL final: ${account.finalUrl || 'N/A'}\n`;

    const blob = new Blob([accountText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bolt_account_${account.username}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();

    showToast('Conta exportada com sucesso');
  }

  
  function showToast(message, type = 'success') {
    
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    });

    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        <svg viewBox="0 0 24 24">
          <path d="${type === 'success'
        ? 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
        : 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'}"/>
        </svg>
      </div>
      <div class="toast-content">${message}</div>
      <button class="toast-close">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    `;

    
    document.body.appendChild(toast);

    
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    });

    
    setTimeout(() => toast.classList.add('toast-show'), 10);

    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }

  function saveAccounts() {
    localStorage.setItem('bolt_accounts', JSON.stringify(appState.accounts));
  }

  function loadAccounts() {
    const savedAccounts = localStorage.getItem('bolt_accounts');
    if (savedAccounts) {
      try {
        appState.accounts = JSON.parse(savedAccounts);

        
        appState.accounts.forEach(account => {
          if (!account.id) {
            account.id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          }
        });
      } catch (e) {
        console.error('Erro ao carregar contas:', e);
        appState.accounts = [];
      }
    }
  }

  function saveSettings() {
    appState.settings.headlessMode = headlessModeToggle.checked;
    appState.settings.maxRetries = parseInt(maxRetriesInput.value);

    localStorage.setItem('bolt_settings', JSON.stringify(appState.settings));
    showToast('Configurações salvas com sucesso');
  }

  function loadSettings() {
    const savedSettings = localStorage.getItem('bolt_settings');
    if (savedSettings) {
      try {
        appState.settings = { ...appState.settings, ...JSON.parse(savedSettings) };

        
        headlessModeToggle.checked = appState.settings.headlessMode;
        maxRetriesInput.value = appState.settings.maxRetries;
      } catch (e) {
        console.error('Erro ao carregar configurações:', e);
      }
    }

    
    const darkMode = localStorage.getItem('dark_mode') === 'true';
    if (darkMode) {
      document.body.classList.add('dark-theme');
      appState.darkMode = true;
    }
  }

  function ensureToggleState() {
    if (headlessModeToggle) {
      
      if (headlessModeToggle.checked !== appState.settings.headlessMode) {
        headlessModeToggle.checked = appState.settings.headlessMode === true;
        console.log(`Corrigido estado do toggle: ${headlessModeToggle.checked}`);
      }
    }
  }

  function toggleDarkMode() {
    appState.darkMode = !appState.darkMode;
    document.body.classList.toggle('dark-theme', appState.darkMode);
    localStorage.setItem('dark_mode', appState.darkMode);

    showToast(`Tema ${appState.darkMode ? 'escuro' : 'claro'} ativado`);
  }

  
  async function startAutomation() {
    if (appState.running) return;

    setRunningState(true);
    clearLog();
    addLogEntry('Iniciando processo de automação...', 'info');
    statusText.textContent = 'Iniciando...';
    statusDescription.textContent = 'Preparando para criar uma nova conta no Bolt.new';
    progressBar.style.width = '0%';

    
    console.log('Configurações atuais:', appState.settings);
    addLogEntry(`Modo headless: ${appState.settings.headlessMode ? 'Ativado' : 'Desativado'}`);

    try {
      
      const options = {
        headless: appState.settings.headlessMode === true, 
        maxRetries: appState.settings.maxRetries
      };

      
      console.log('Enviando opções para automação:', options);

      const result = await ipcRenderer.invoke('start-automation', options);

      return result;
    } catch (error) {
      addLogEntry(`Erro ao iniciar automação: ${error.message}`, 'error');
      setRunningState(false);
      statusText.textContent = 'Erro';
      statusDescription.textContent = `Falha ao iniciar: ${error.message}`;
      statusIcon.className = 'status-icon error';
      statusIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';

      showToast('Falha ao iniciar automação', 'error');
    }
  }

  
  function exportAccounts(format = 'txt') {
    if (appState.accounts.length === 0) {
      showToast('Não há contas para exportar', 'error');
      return;
    }

    let content = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (format === 'txt') {
      content = appState.accounts.map(acc =>
        `=== CONTA BOLT.NEW ===\n\n` +
        `Email: ${acc.email}\n` +
        `Username: ${acc.username}\n` +
        `Password: ${acc.password}\n` +
        `Data: ${new Date(acc.date || acc.createdAt || Date.now()).toLocaleString()}\n` +
        `Status: ${acc.confirmed ? 'Confirmada' : 'Não confirmada'}\n` +
        `Link de confirmação: ${acc.confirmationLink || 'N/A'}\n` +
        `URL final: ${acc.finalUrl || 'N/A'}\n`
      ).join('\n\n' + '='.repeat(30) + '\n\n');

      mimeType = 'text/plain';
      extension = 'txt';
    }
    else if (format === 'json') {
      content = JSON.stringify(appState.accounts, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    }
    else if (format === 'csv') {
      
      const headers = ['Email', 'Username', 'Password', 'Date', 'Status', 'ConfirmationLink', 'FinalUrl'];

      
      const rows = appState.accounts.map(acc => [
        acc.email,
        acc.username,
        acc.password,
        new Date(acc.date || acc.createdAt || Date.now()).toLocaleString(),
        acc.confirmed ? 'Confirmada' : 'Não confirmada',
        acc.confirmationLink || 'N/A',
        acc.finalUrl || 'N/A'
      ]);

      
      content = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      mimeType = 'text/csv';
      extension = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bolt_accounts_${new Date().toISOString().slice(0, 10)}.${extension}`;
    a.click();

    showToast(`${appState.accounts.length} contas exportadas em formato ${format.toUpperCase()}`);
  }

  
  function setupSearchAndFilter() {
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
      <input type="text" id="account-search" placeholder="Buscar contas..." class="search-input">
      <button id="clear-search" class="search-clear">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    `;

    
    const accountsHeader = document.querySelector('.accounts-header');
    if (accountsHeader) {
      accountsHeader.parentNode.insertBefore(searchContainer, accountsHeader.nextSibling);

      
      const searchInput = document.getElementById('account-search');
      const clearSearchBtn = document.getElementById('clear-search');

      if (searchInput && clearSearchBtn) {
        searchInput.addEventListener('input', () => {
          const searchTerm = searchInput.value.toLowerCase().trim();

          if (searchTerm === '') {
            renderAccountsList(); 
            clearSearchBtn.style.display = 'none';
            return;
          }

          clearSearchBtn.style.display = 'block';

          
          const filteredAccounts = appState.accounts.filter(acc =>
            acc.email.toLowerCase().includes(searchTerm) ||
            acc.username.toLowerCase().includes(searchTerm) ||
            acc.password.toLowerCase().includes(searchTerm)
          );

          if (filteredAccounts.length === 0) {
            accountsList.innerHTML = `
              <div class="empty-state">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <p>Nenhuma conta encontrada para "${searchTerm}"</p>
              </div>
            `;
          } else {
            
            const originalAccounts = [...appState.accounts];

            
            appState.accounts = filteredAccounts;
            renderAccountsList();

            
            appState.accounts = originalAccounts;
          }
        });

        clearSearchBtn.addEventListener('click', () => {
          searchInput.value = '';
          renderAccountsList();
          clearSearchBtn.style.display = 'none';
        });
      }
    }
  }

  
  function setupEventListeners() {
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        ipcRenderer.send('close-app');
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        ipcRenderer.send('minimize-app');
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        ipcRenderer.send('maximize-app');
      });
    }

    
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        navItems.forEach(navItem => navItem.classList.remove('active'));
        contentViews.forEach(view => view.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(`${targetView}-view`).classList.add('active');
      });
    });

    
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (appState.running) {
          
          setRunningState(false);
          addLogEntry('Processo interrompido pelo usuário', 'warn');
          statusText.textContent = 'Interrompido';
          statusDescription.textContent = 'O processo foi interrompido pelo usuário';
          statusIcon.className = 'status-icon pending';
          statusIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>';
          showToast('Automação interrompida pelo usuário', 'warn');
        } else {
          startAutomation();
        }
      });
    }

    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', clearLog);
    }

    
    if (exportAccountsBtn) {
      exportAccountsBtn.addEventListener('click', () => {
        if (appState.accounts.length === 0) {
          showToast('Não há contas para exportar', 'error');
          return;
        }

        
        const exportOptions = document.createElement('div');
        exportOptions.className = 'export-options';
        exportOptions.innerHTML = `
          <div class="export-options-content">
            <h3>Exportar Contas</h3>
            <p>Escolha o formato de exportação:</p>
            <div class="export-buttons">
              <button id="export-txt" class="secondary-button">
                <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                Texto (.txt)
              </button>
              <button id="export-json" class="secondary-button">
                <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                JSON
              </button>
              <button id="export-csv" class="secondary-button">
                <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                CSV
              </button>
            </div>
            <button id="cancel-export" class="text-button">Cancelar</button>
          </div>
        `;

        
        document.body.appendChild(exportOptions);

        
        setTimeout(() => exportOptions.classList.add('active'), 10);

        
        document.getElementById('export-txt').addEventListener('click', () => {
          exportAccounts('txt');
          exportOptions.classList.remove('active');
          setTimeout(() => exportOptions.remove(), 300);
        });

        document.getElementById('export-json').addEventListener('click', () => {
          exportAccounts('json');
          exportOptions.classList.remove('active');
          setTimeout(() => exportOptions.remove(), 300);
        });

        document.getElementById('export-csv').addEventListener('click', () => {
          exportAccounts('csv');
          exportOptions.classList.remove('active');
          setTimeout(() => exportOptions.remove(), 300);
        });

        document.getElementById('cancel-export').addEventListener('click', () => {
          exportOptions.classList.remove('active');
          setTimeout(() => exportOptions.remove(), 300);
        });
      });
    }

    
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveSettings);
    }

    
    if (closeModalBtn && resultModal) {
      closeModalBtn.addEventListener('click', () => {
        resultModal.classList.remove('active');
      });

      
      resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
          resultModal.classList.remove('active');
        }
      });
    }

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-copy-target');
        const text = document.getElementById(targetId).textContent;
        navigator.clipboard.writeText(text);

        
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

        setTimeout(() => {
          btn.innerHTML = originalIcon;
        }, 1500);

        showToast('Copiado para a área de transferência');
      });
    });

    if (saveAccountBtn) {
      saveAccountBtn.addEventListener('click', () => {
        resultModal.classList.remove('active');
      });
    }

    
    const themeToggle = document.createElement('button');
    themeToggle.className = 'icon-button theme-toggle';
    themeToggle.title = 'Alternar tema claro/escuro';
    themeToggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>';

    
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.insertBefore(themeToggle, sidebar.firstChild);
      themeToggle.addEventListener('click', toggleDarkMode);
    }

    
    
    ipcRenderer.removeAllListeners('update-progress');
    ipcRenderer.removeAllListeners('automation-success');
    ipcRenderer.removeAllListeners('automation-error');

    
    ipcRenderer.on('update-progress', (event, data) => {
      updateProgress(data);
    });

    ipcRenderer.on('automation-success', (event, result) => {
      setRunningState(false);
      statusText.textContent = 'Concluído';
      statusDescription.textContent = 'Conta criada e confirmada com sucesso';
      statusIcon.className = 'status-icon success';
      statusIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

      addLogEntry('Automação concluída com sucesso!', 'success');

      
      if (!result || !result.accountInfo) {
        console.error('Dados da conta ausentes no resultado:', result);
        addLogEntry('Erro: Dados da conta não recebidos corretamente', 'error');
        showToast('Conta criada mas os detalhes não foram recebidos corretamente', 'warn');
        return;
      }

      
      addAccountToList(result.accountInfo);

      
      showResultModal(result.accountInfo);

      showToast('Conta criada com sucesso!');
    });

    ipcRenderer.on('automation-error', (event, data) => {
      setRunningState(false);
      statusText.textContent = 'Erro';
      statusDescription.textContent = data.message;
      statusIcon.className = 'status-icon error';
      statusIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';

      addLogEntry(data.message, 'error');

      showToast('Erro na automação', 'error');
    });

    
    if (headlessModeToggle) {
      headlessModeToggle.addEventListener('change', function(e) {
        appState.settings.headlessMode = e.target.checked;
        addLogEntry(`Modo headless ${e.target.checked ? 'ativado' : 'desativado'}`, 'info');

        
        localStorage.setItem('bolt_settings', JSON.stringify(appState.settings));

        
        showToast(`Modo headless ${e.target.checked ? 'ativado' : 'desativado'}`, 'info');
      });
    }
  }

  
  function init() {
    
    initializeLogSystem();
    
    
    if (progressBar) {
      progressBar.style.width = '0%';
    }

    loadSettings();
    ensureToggleState();
    loadAccounts();
    renderAccountsList();
    setupEventListeners();
    setupSearchAndFilter();

    
    const electronVersionEl = document.getElementById('electron-version');
    const nodeVersionEl = document.getElementById('node-version');
    
    if (electronVersionEl) {
      electronVersionEl.textContent = process.versions.electron || 'N/A';
    }
    
    if (nodeVersionEl) {
      nodeVersionEl.textContent = process.versions.node || 'N/A';
    }

    addLogEntry('Aplicação iniciada', 'info');

    
    setTimeout(() => {
      addLogEntry('Verificação de sistema concluída', 'info');
    }, 1500);
  }

  
  init();
});