/*
Este arquivo serve como ponto de injeção de configurações. 
No desenvolvimento local, contém placeholders, mas durante o deploy pelo GitHub Actions, 
é substituído pelos valores reais dos secrets do repositório. 
Esta abordagem segue as práticas de segurança, evitando hardcoding de credenciais no código fonte. 
O arquivo é carregado antes de app.js, garantindo que as configurações estejam disponíveis quando 
a aplicação inicia.
*/
window.CLIENT_ID = 'PLACEHOLDER_CLIENT_ID';
window.GITHUB_PAT = 'PLACEHOLDER_PAT';
window.REAL_DATA_MODE = false;