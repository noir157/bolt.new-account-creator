const AccountManager = require('./src/AccountManager');
const helpers = require('./src/utils/helpers');

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  AUTOMAÇÃO DE CRIAÇÃO E CONFIRMAÇÃO DE CONTA NO BOLT.NEW');
    console.log('='.repeat(70) + '\n');
    
    const accountManager = new AccountManager();
    const result = await accountManager.createAndConfirmAccount();
    
    if (result.success) {
      console.log('\n' + '='.repeat(70));
      console.log('  RESUMO DO PROCESSO - SUCESSO');
      console.log('='.repeat(70));
      console.log(`• Email: ${result.accountInfo.email}`);
      console.log(`• Username: ${result.accountInfo.username}`);
      console.log(`• Password: ${result.accountInfo.password}`);
      console.log(`• Status: Conta confirmada com sucesso`);
      console.log(`• Data/Hora: ${new Date().toLocaleString()}`);
      console.log(`• Detalhes salvos em: ./bolt_account_result/`);
      console.log('='.repeat(70));
    } else {
      console.log('\n' + '='.repeat(70));
      console.log('  RESUMO DO PROCESSO - FALHA');
      console.log('='.repeat(70));
      console.log(`• Erro: ${result.error}`);
      console.log(`• Data/Hora: ${new Date().toLocaleString()}`);
      console.log('\nSUGESTÕES PARA RESOLUÇÃO:');
      console.log('1. Verifique sua conexão com a internet');
      console.log('2. O serviço mail.tm pode estar indisponível temporariamente');
      console.log('3. O site bolt.new pode ter mudado sua estrutura');
      console.log('4. Verifique se o serviço de email temporário não está bloqueado');
      console.log('='.repeat(70));
    }
  } catch (error) {
    console.error('\n❌ ERRO FATAL NO PROCESSO PRINCIPAL:');
    console.error(error);
    console.log('\nPor favor, verifique as dependências do projeto e tente novamente.');
  }
}

main();