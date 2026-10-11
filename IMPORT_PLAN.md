# Plano da importação de currículos

## Objetivo

Reduzir o tempo de preenchimento a partir de um PDF com texto selecionável ou um DOCX, sem enviar o arquivo ou seus dados a servidores.

## Escopo e etapas

1. Validar tipo, assinatura e tamanho (até 5 MB), com limites de processamento.
2. Extrair texto no navegador com PDF.js ou Mammoth, carregados somente quando necessários.
3. Identificar campos por regras conservadoras em português, sem completar lacunas por suposição.
4. Mostrar os dados detectados e os não reconhecidos em uma tela de revisão editável.
5. Aplicar apenas após confirmação explícita quando já houver dados no formulário.
6. Testar documentos fictícios, erros, build e fluxos existentes.

## Riscos e limites

Layouts livres, tabelas e colunas podem alterar a ordem do texto extraído. A revisão humana é obrigatória. PDFs digitalizados sem camada de texto não são aceitos nesta etapa. DOCX compactados com tamanho expandido excessivo são rejeitados. Não há OCR, IA, banco de dados ou rede para processar arquivos.

## Correção da segmentação (2026-10-11)

Objetivo: impedir que empregos consecutivos se misturem e preservar formações, certificações e idiomas.

Etapas verificáveis: ampliar datas e títulos de seção; segmentar entradas por períodos mesmo em linhas separadas; separar cargo, empresa, período e local; exibir confiança e permitir reordenar na revisão; persistir e exportar os novos campos; testar PDFs fictícios de uma e várias páginas e DOCX, inclusive descrições longas. Risco principal: layouts com colunas ou sem datas deixam a ordem ambígua. Nesses casos, sinalizar para revisão em vez de atribuir informações por suposição.
