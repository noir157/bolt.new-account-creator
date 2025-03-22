const { EventEmitter } = require('events');
const StorageService = require('../services/StorageService');

class AccountModel extends EventEmitter {
  constructor() {
    super();
    this.accounts = [];
    this.storage = new StorageService('accounts');
    this.loadAccounts();
  }

  async loadAccounts() {
    try {
      this.accounts = await this.storage.get('list') || [];
      this.emit('accounts-loaded', this.accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.accounts = [];
    }
  }

  async addAccount(accountData) {
    // Adicionar metadados
    const enhanced = {
      ...accountData,
      id: `acc_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    this.accounts.unshift(enhanced); // Adicionar ao início da lista
    await this.storage.set('list', this.accounts);
    this.emit('account-added', enhanced);
    return enhanced;
  }

  async removeAccount(id) {
    this.accounts = this.accounts.filter(acc => acc.id !== id);
    await this.storage.set('list', this.accounts);
    this.emit('account-removed', id);
    return true;
  }

  async getAccountStats() {
    return {
      total: this.accounts.length,
      lastCreated: this.accounts[0]?.createdAt || null,
      domains: this.getDomainStats()
    };
  }

  getDomainStats() {
    const domains = {};
    this.accounts.forEach(acc => {
      const domain = acc.email.split('@')[1];
      domains[domain] = (domains[domain] || 0) + 1;
    });
    return domains;
  }

  async searchAccounts(query) {
    if (!query) return this.accounts;
    
    const lowerQuery = query.toLowerCase();
    return this.accounts.filter(acc => 
      acc.email.toLowerCase().includes(lowerQuery) || 
      acc.username.toLowerCase().includes(lowerQuery)
    );
  }

  async exportAccounts(format = 'json') {
    switch(format) {
      case 'csv':
        return this.exportAsCSV();
      case 'json':
      default:
        return JSON.stringify(this.accounts, null, 2);
    }
  }

  exportAsCSV() {
    const headers = ['Username', 'Email', 'Password', 'Created At', 'Status'];
    const rows = this.accounts.map(acc => [
      acc.username,
      acc.email,
      acc.password,
      new Date(acc.createdAt).toLocaleString(),
      acc.status
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

module.exports = AccountModel;