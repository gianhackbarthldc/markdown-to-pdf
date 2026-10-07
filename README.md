# mk-pdf

CLI para converter arquivos Markdown em PDFs estilizados no padrão do GitHub —
ideal para anexar documentações a usuários não técnicos.

Funciona de forma parecida com o [markdowntopdf.com](https://www.markdowntopdf.com/),
mas direto no seu terminal (cmd/PowerShell), sem precisar subir arquivos em um site.

## Recursos

- Estilo visual idêntico ao renderizado de Markdown do GitHub (`github-markdown-css`)
- Realce de sintaxe em blocos de código (via `highlight.js`)
- Sumário/índice automático e estilizado (fonte Montserrat) no topo do documento
- Logo da LDC fixado no canto superior esquerdo de todas as páginas
- Título customizável (`--title`) centralizado no topo de cada página
- Numeração de páginas no rodapé (ex: "Página 2 de 5")
- Suporte a imagens locais referenciadas por caminho relativo
- Suporte a diagramas [Mermaid](https://mermaid.js.org/) (` ```mermaid `)
- Conversão em lote: arquivo único, padrão glob (`*.md`) ou pasta inteira (recursivo)

## Instalação

Pré-requisito: [Node.js](https://nodejs.org/) 18+ instalado.

```powershell
cd "Markdown to PDF"
npm install
npm install -g .
```

Isso instala o comando `mk-pdf` globalmente (via `npm install -g .`), criando um
atalho que aponta para este projeto. O primeiro `npm install` baixa o Chromium
usado internamente pelo Puppeteer para renderizar o PDF (download único, ~200MB).

> Se o comando `mk-pdf` não for reconhecido depois de instalado, feche e reabra o
> terminal (o PATH do npm global só é lido ao abrir uma nova sessão).

## Uso

```powershell
# Um único arquivo (gera documentacao.pdf na mesma pasta)
mk-pdf documentacao.md

# Vários arquivos via glob
mk-pdf *.md

# Pasta inteira (busca .md recursivamente)
mk-pdf .\docs

# Escolher pasta de saída para os PDFs
mk-pdf .\docs -o .\pdfs

# Definir um título centralizado no topo de cada página
mk-pdf documentacao.md --title "Manual do Usuário"

# Desligar sumário automático ou renderização de Mermaid
mk-pdf documentacao.md --no-toc
mk-pdf documentacao.md --no-mermaid
```

### Opções

| Opção              | Descrição                                               |
|---------------------|----------------------------------------------------------|
| `-o, --output <pasta>` | Pasta de destino dos PDFs (padrão: mesma pasta do .md) |
| `-t, --title <titulo>` | Título centralizado no topo de cada página do PDF     |
| `--no-toc`           | Não gera sumário/índice automático                      |
| `--no-mermaid`       | Não renderiza diagramas Mermaid (mostra o código bruto)  |

## Teste rápido

Um arquivo de exemplo cobrindo todos os recursos está em `test/sample.md`:

```powershell
mk-pdf test\sample.md -o test\output
```

## Estrutura do projeto

```
bin/mk-pdf.js        # entry point do CLI (shebang)
src/cli.js            # parsing de argumentos e orquestração do lote
src/convert.js         # pipeline markdown -> html -> pdf
src/template.js         # template HTML (CSS do GitHub + impressão + mermaid)
src/resolveAssets.js     # resolução de imagens locais referenciadas no markdown
assets/pdf.css            # estilos de impressão customizados
assets/ldc-logo.png         # logo exibido no cabeçalho de cada página
test/sample.md             # arquivo de teste com todos os recursos
```
