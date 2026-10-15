# Manuais de treinamento

O gerador `scripts/generate-user-manuals.py` reúne procedimentos conferidos nos componentes e regras atuais do painel. Existem três manuais separados: Atendente (5 páginas), Editor (4) e Gestora (7).

Cada capítulo explica finalidade, caminho, botões, campos, resultado esperado e limites importantes do fluxo. Senhas não fazem parte dos documentos. Os PDFs e capturas ficam em `output/`, fora do Git e da imagem de produção.

## Capturas reais

A versão ilustrada depende de capturas reais feitas com acesso aos três perfis. A sessão de 14/10/2026 não tinha navegador habilitado: inventário vazio e tentativa de abrir o navegador integrado retornou indisponível. Nenhuma imagem de interface foi simulada.

As chaves de captura estão no gerador. Salve `output/manual-captures/manifest.json` com um objeto que associa cada chave ao caminho da imagem real. Confira os dados e o perfil de cada tela antes de gerar os PDFs ilustrados. O gerador interrompe se faltar captura; não substitui prints por desenhos.

Use `python scripts/generate-user-manuals.py` para a versão ilustrada. `--text-draft` permite revisão do conteúdo em PDFs claramente identificados como versão textual com capturas pendentes.

Antes da entrega, renderize e confira todas as páginas, incluindo legibilidade dos prints e ausência de corte de conteúdo. A revisão da versão textual não substitui a revisão da versão ilustrada.
