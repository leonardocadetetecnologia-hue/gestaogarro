# Acessos e credenciais

Este documento contém referências de acesso, nunca valores secretos.

## VPS de produção

- Finalidade: hospedar Garro com Docker Compose atrás do Traefik existente.
- URL: `https://cadete.tech/gestaogarro`.
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
- Configuração pública: `DOMAIN=cadete.tech`, `BASE_PATH=/gestaogarro`.
- Renovação: realizar separadamente a atualização das credenciais do serviço e do `.env`, validar o acesso e reiniciar apenas os serviços afetados. Rotacionar o segredo de sessão invalida sessões existentes; tratar como operação específica.
- Última rotação: não informada.

## GitHub

- Repositório: `leonardocadetetecnologia-hue/gestaogarro`.
- Finalidade: versionamento e origem do deploy manual.
- Autenticação local: mecanismo já configurado no Git do operador; não copiar tokens para arquivos do projeto.
- Responsável e renovação: titular da conta GitHub, pelas configurações de credenciais do provedor.
- Última rotação: não informada.
