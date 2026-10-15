# Importação de leads do CRM anterior

Importação autorizada pelo usuário em 14/10/2026, a partir de `leads-2026-10.xlsx`. Dados pessoais da planilha e relatórios detalhados são arquivos operacionais privados, fora do repositório.

## Resultado verificado

- 19 oportunidades importadas e vinculadas à conta ativa da Atendente.
- 17 contatos novos e 2 cadastros existentes reaproveitados por telefone e nome coincidentes.
- 18 oportunidades em Lead e 1 em Follow-up, correspondente à antiga Tentativa de contato.
- 6 valores de negociação positivos preservados, totalizando R$ 26.207,00. Os outros 13 tinham zero sem negociação e ficaram com valor não definido. O valor bruto original permanece nas observações.
- Nenhum serviço informado na origem; apresentado como Serviço a definir. Sem datas de último contato, próximas atividades ou retomada preenchidas; não foram criados compromissos fictícios.
- Datas de cadastro originais preservadas. Como o arquivo contém somente dia, a importação usa início do dia no horário de Brasília para armazenamento. Metadados antigos adicionais constam nas observações e no registro de importação do histórico.
- Nenhuma demanda nem venda foi criada pela importação. Cadastros existentes não foram sobrescritos nem rebaixados de cliente para lead.

## Procedimento e integridade

`scripts/import-legacy-leads.mjs` recebe JSON preparado e validado. Sem `--apply`, executa somente simulação. A gravação usa uma transação, auditoria por registro e bloqueio de importação. Chaves derivadas do hash do arquivo e da linha tornam a repetição idempotente.

O processo compara telefone normalizado e nome antes de reaproveitar um cadastro. Telefone ambíguo ou com nome diferente é separado para revisão, sem mesclagem automática. Uma oportunidade equivalente já existente pode ser reaproveitada. Não altera o conteúdo da planilha de origem.

Foi feito backup PostgreSQL antes da gravação. A segunda execução de simulação reconheceu os 19 registros importados e propôs zero novas gravações. A verificação HTTP autenticada confirmou as oportunidades no painel da Atendente; a consulta ao banco confirmou responsável e distribuição por etapa.

JSONs e relatórios na VPS devem permanecer com permissão 600; o acesso operacional e os backups seguem a documentação existente. Não registre dados pessoais ou segredos no Git.
