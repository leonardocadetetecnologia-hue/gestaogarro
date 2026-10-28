# Acessos e credenciais

Este documento contém referências de acesso, nunca valores secretos.

## VPS de produção

- Finalidade: hospedar Garro com Docker Compose atrás do Traefik existente.
- URL: `https://garroprodutora.com.br/gestaogarro` (endereço anterior em cadete.tech mantido).
- Host SSH verificado em 14/10/2026: `2.25.229.131`.
- Usuário operacional utilizado: `root`.
- Diretório: `/opt/garro`; branch de publicação: `main`.
- Autenticação: chave SSH existente `~/.ssh/id_ed25519` no computador do operador; a chave privada não pertence ao repositório.
- Chave do servidor: registrada no `known_hosts` local, verificada com `StrictHostKeyChecking=yes`.
- Responsável: operador da infraestrutura do projeto.
- Renovação: provisionar a nova chave pública no servidor, confirmar o acesso e somente então revogar a anterior. Última rotação não informada.

## Configuração privada da aplicação

- Local seguro: `/opt/garro/.env` na VPS; nunca versionado.
- PostgreSQL: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`.
- Sessões: `SESSION_SECRET`.
- Usuários iniciais: variáveis `SEED_*` documentadas em `.env.example`; não reexecutar seed em atualizações.
- Configuração pública: `DOMAIN=garroprodutora.com.br`, `BASE_PATH=/gestaogarro`.
- Renovação: realizar separadamente a atualização das credenciais do serviço e do `.env`, validar o acesso e reiniciar apenas os serviços afetados. Rotacionar o segredo de sessão invalida sessões existentes; tratar como operação específica.
- Última rotação: não informada.

## GitHub

- Repositório: `leonardocadetetecnologia-hue/gestaogarro`.
- Finalidade: versionamento e origem do deploy manual.
- Autenticação local: mecanismo já configurado no Git do operador; não copiar tokens para arquivos do projeto.
- Responsável e renovação: titular da conta GitHub, pelas configurações de credenciais do provedor.
- Última rotação: não informada.

## Contas da aplicação

- Perfis iniciais: Gestora e Atendente. Editores são cadastrados pela Gestora.
- O acesso aceita nome de usuário ou e-mail para contas legadas que ainda não tenham nome de usuário.
- Nome de usuário é único e normalizado em minúsculas; e-mail continua separado dos dados de acesso. Ao definir um nome de usuário, o e-mail antigo deixa de autenticar essa conta.
- Senhas são armazenadas somente como hash bcrypt no PostgreSQL, nunca no repositório ou nesta documentação.
- Renovação administrativa: validar contas e conflitos, gerar os hashes, atualizar os nomes de usuário/senhas, excluir as sessões dessas contas e registrar auditoria na mesma transação. Conferir login e perfil no domínio publicado. Não reexecutar seed para trocar acessos.
- A troca solicitada em 14/10/2026 mantém IDs, perfis e vínculos de trabalho; os valores das credenciais são fornecidos pelo titular e não são documentados aqui.
- Desde 27/10/2026 há duas atendentes com o mesmo perfil: `malu.atendente` (a conta que já existia; o identificador e os vínculos permanecem, a senha anterior foi mantida e o nome exibido passou a ser `malu.atendente`) e `ana.atendente` (conta nova, sem dados herdados). As duas não consultam o Kanban nem as ações uma da outra. A Gestora vê os dois quadros, com o nome exibido da atendente em cada item.
