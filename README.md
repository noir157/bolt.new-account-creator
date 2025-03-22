Bolt Account Creator



!Bolt Account Creator Logo



Um aplicativo desktop elegante e eficiente para automatizar a criação de contas no Bolt.new. Desenvolvido com Electron e Puppeteer, este aplicativo simplifica o processo de registro, confirmação e gerenciamento de múltiplas contas.



📋 Características



Criação Automatizada de Contas: Cria contas Bolt.new com apenas um clique

Confirmação Automática: Verifica emails e confirma contas automaticamente

Gerenciamento de Contas: Interface intuitiva para gerenciar todas as suas contas

Exportação Flexível: Exporte suas contas em vários formatos (TXT, JSON, CSV)

Interface Moderna: Design limpo e responsivo com suporte a tema escuro

Log Detalhado: Acompanhe cada etapa do processo com logs em tempo real

Modo Headless: Opção para executar o navegador em segundo plano





🚀 Instalação



Pré-requisitos



Node.js (v14 ou superior)

npm (v6 ou superior)



Passos para Instalação



Clone o repositório:

git clone https://github.com/seu-usuario/bolt-account-creator.git
cd bolt-account-creator



Instale as dependências:

npm install



Execute o aplicativo:

npm start



Builds para Distribuição



Para criar executáveis para diferentes plataformas:



# Para todas as plataformas
npm run build

# Específico para Windows
npm run build:win

# Específico para macOS
npm run build:mac

# Específico para Linux
npm run build:linux



Os arquivos de distribuição serão gerados no diretório dist/.



🛠️ Tecnologias



Electron: Framework para criar aplicativos desktop com tecnologias web

Puppeteer: Biblioteca Node.js para controle do Chrome/Chromium

TempMail API: Serviço para emails temporários

JavaScript: Linguagem de programação principal

HTML/CSS: Interface do usuário e estilização



📂 Estrutura do Projeto



bolt-account-creator/
├── assets/              # Recursos estáticos (imagens, ícones)
├── dist/                # Builds de distribuição
├── src/                 # Código-fonte
│   ├── services/        # Serviços de integração (TempEmail, etc.)
│   ├── utils/           # Utilitários e helpers
│   └── AccountManager.js # Lógica principal de automação
├── index.html           # Página principal da aplicação
├── main.js              # Ponto de entrada do Electron (processo principal)
├── renderer.js          # Código do processo de renderização
├── preload.js           # Script de pré-carregamento
└── package.json         # Configuração do projeto e dependências



💡 Como Usar



Iniciar Automação: Na aba Dashboard, clique em "Iniciar Automação"

Acompanhar Progresso: Observe o progresso em tempo real e os logs detalhados

Gerenciar Contas: Acesse a aba Contas para visualizar, copiar ou exportar suas contas

Configurações: Personalize o comportamento da aplicação na aba Configurações



Opções de Configuração



Modo Headless: Execute o navegador em segundo plano para maior velocidade

Máximo de Tentativas: Configure quantas tentativas o sistema fará em caso de falha

Tema Escuro: Alterne entre os modos claro e escuro para conforto visual



🔒 Segurança e Privacidade



Todos os dados são armazenados localmente em seu computador

Nenhuma informação é compartilhada com servidores externos (exceto para criar as contas)

As senhas são armazenadas em texto simples apenas localmente - use com responsabilidade



🤝 Contribuindo



Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.



Fork o projeto

Crie sua branch de feature (git checkout -b feature/AmazingFeature)

Commit suas alterações (git commit -m 'Add some AmazingFeature')

Push para a branch (git push origin feature/AmazingFeature)

Abra um Pull Request



⚠️ Aviso Legal



Este software é fornecido apenas para fins educacionais e de automação pessoal. O uso deste software para violar termos de serviço de qualquer plataforma é de responsabilidade exclusiva do usuário. Os desenvolvedores não se responsabilizam pelo uso indevido deste aplicativo.



📄 Licença



Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.



<div align="center">
  <p>Desenvolvido com ❤️ por <a href="https://github.com/noir157">Noir</a></p>
  <p>⭐ Não se esqueça de dar uma estrela se gostou do projeto! ⭐</p>
</div>
