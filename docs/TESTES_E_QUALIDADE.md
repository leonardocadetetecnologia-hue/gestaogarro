# Validação

Comandos locais: `npm run lint`, `npm run typecheck`, `npm test`. Build Linux: Dockerfile, target runner, `BASE_PATH=/gestaogarro`.

A suíte de autenticação cobre login por usuário, normalização sem alterar senha, compatibilidade com e-mail somente em contas legadas, senha incorreta, perfil incompatível, conta inativa e limite de tentativas. Credenciais dos testes são fictícias. A confirmação de troca em produção verifica login real por perfil e revogação das sessões anteriores sem registrar senhas ou cookies nos logs.

O endpoint estável de entrada também testa origem ausente/divergente, formato inválido, corpo grande, respostas de erro sem informações internas, opção lembrar de mim e redirecionamento para o painel no prefixo de publicação. A renderização confirma o rótulo Usuário e a ausência de `type=email`. A página dinâmica deve responder sem cache em produção. Foi identificado em log o erro de Server Action de uma publicação anterior, relacionado à tela de login desatualizada; o novo fluxo remove essa dependência na entrada.

Script por entregável: testes cobrem limite exato de 10.000 caracteres, rejeição de excesso, preservação de texto, limpeza, autorização, idempotência e conflito entre sessões. A renderização confirma que a caixa começa oculta mesmo com script salvo. O teste PostgreSQL isolado verifica persistência real, acesso do editor somente às próprias atribuições e rollback da alteração se a auditoria falhar. Não são inseridos dados de teste em produção.

A suíte Vitest cobre envio explícito/idempotente para produção, valores decimais, permissões, estado filtrado por perfil, agendas no horário de Brasília, origem dos eventos e renderização de cartões, confirmações e atribuição da Gestora. A criação direta exige cliente ou novo cadastro, briefing, prazo e entregáveis e bloqueia perfis não administrativos.

`scripts/test-flow-integration.ts` valida serviços reais em PostgreSQL isolado: persistência, dupla submissão concorrente, rollback após erro de banco, conversão de lead, novas oportunidades, criação direta sem venda, cadastro de cliente com rollback e edição de editor com RBAC. Recusa bancos fora do host/database de QA definidos no script. Não execute contra produção.

Quando `QA_APP_URL` e `QA_SESSION_SECRET` são fornecidos, o teste verifica HTTP autenticado das agendas nos três perfis. As sessões/fixtures são exclusivas do banco temporário. Containers de QA e suas credenciais devem ser removidos ao terminar.

Não havia navegador disponível na sessão de implementação. Os testes de renderização e HTTP não substituem revisão visual interativa; não foi afirmada validação por screenshots.

As migrations preservam os enums comerciais antigos, acrescentam as novas etapas, classificam contatos com venda/demanda/fechamento prévio como clientes e permitem demandas sem venda. O deploy executa backup antes de aplicar migrations pendentes, preserva a imagem anterior e exige healthcheck. Atualizações não utilizam seed.
