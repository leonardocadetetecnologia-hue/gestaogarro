# Identidade visual Garro

O símbolo aprovado pelo usuário é o G circular formado por um diafragma de câmera. A adaptação para o sistema preserva essa composição e utiliza a paleta terracota já definida no projeto.

## Aplicação

- Cor do símbolo: `--terra`, atualmente `#A65F45`.
- Fundo e espaços negativos transparentes; sem disco branco ou cantos pretos.
- Escrita Garro Produtora: `public/images/garro-wordmark.png`, preservada.
- Sem textura metálica, sombra ou efeito de relevo na interface.
- Login: símbolo e escrita juntos.
- Cabeçalho do painel: versão composta compacta.
- Menus dos dois layouts: símbolo, sem distorcer a proporção quadrada.

`src/components/garro-brand.tsx` centraliza `GarroMark` e `GarroBrand`. O símbolo é aplicado como máscara alfa, para garantir a cor exata do token CSS. A URL inclui `NEXT_PUBLIC_BASE_PATH`, mantendo o carregamento em `/gestaogarro`. A composição expõe um único nome acessível; o símbolo é decorativo quando acompanhado da escrita.

## Arquivos e origem

- Nova adaptação: `public/images/garro-symbol-terracotta.webp`, codificada sem perdas a partir do PNG gerado. A transparência foi comparada pixel a pixel e permanece idêntica.
- Originais e referências existentes permanecem disponíveis em `public/images/`.
- Ferramenta: `imagegen` integrada, edição da referência enviada pelo usuário.

Prompt utilizado:

O texto exato enviado à ferramenta está em `docs/GARRO_LOGO_PROMPT.txt`. Resumo:

> Recolorir fielmente o logo preto e branco enviado pelo usuário para terracota #A65F45, com fundo realmente transparente. Preservar o contorno do G, o arco circular externo, a barra horizontal direita, as seis lâminas do diafragma, seus ângulos, curvas, espaços e proporções. Remover o disco branco e os cantos pretos; fundo e espaços negativos transparentes. Sem texto novo, redesenho, gradientes, dourado, textura, sombras ou relevo. Símbolo centralizado em uma imagem quadrada com pequena margem e bordas nítidas.

## Validação

Conferir o login em 320, 375, 768, 1024, 1366 e 1920 pixels; validar o símbolo de 32–60 pixels, a transparência e a requisição da imagem sob o prefixo de produção. Executar lint, typecheck, testes existentes e build antes da publicação. A revisão local não substitui a conferência após o deploy.

Validação local em 14/10/2026: lint, typecheck e 8 testes existentes passaram. Build com `BASE_PATH=/gestaogarro` aprovado. A revisão visual das seis larguras ainda depende de um navegador conectado; nenhum estava disponível nesta sessão. Acesso SSH confirmado, com app e PostgreSQL saudáveis antes do deploy. A publicação foi solicitada expressamente pelo usuário após a apresentação dessas limitações.

Smoke test HTTP da versão compilada: `/gestaogarro/login`, `/gestaogarro/images/garro-symbol-terracotta.webp` e a escrita existente retornaram 200. A página contém a URL da máscara com o prefixo correto e a dica de pré-carregamento; o símbolo retorna `image/webp` com 407.984 bytes. Nenhum dado de produção foi alterado.
