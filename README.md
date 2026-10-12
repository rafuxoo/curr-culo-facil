# Currículo Fácil

Gerador gratuito de currículos em português brasileiro. Os dados são editados na página, aparecem em tempo real no modelo profissional e podem ser salvos em PDF A4 pelo recurso de impressão do navegador. Também é possível importar um currículo em PDF ou DOCX para revisão antes de preencher o formulário.

## Objetivo e escopo do MVP

Público inicial: pessoas que precisam criar um currículo pelo celular sem cadastro. Fluxo principal: preencher dados pessoais, objetivo, experiências, formação e habilidades; revisar a prévia; exportar em PDF.

Etapas verificáveis: estrutura e formulário; prévia em tempo real; salvamento local; impressão A4; importação e revisão; responsividade e acessibilidade; validação com usuários. Fora do escopo: contas, banco de dados, nuvem, IA, pagamentos, OCR e múltiplos modelos.

Riscos: a aparência do PDF depende do navegador e do diálogo de impressão; textos longos podem ocupar várias páginas. Títulos de seções e de entradas são mantidos junto ao conteúdo seguinte, enquanto descrições longas podem continuar na página seguinte. A importação usa regras de reconhecimento e pode confundir layouts com colunas, tabelas ou datas; por isso, exige revisão humana. Consulte [IMPORT_PLAN.md](IMPORT_PLAN.md).

## Privacidade

Nenhum dado preenchido ou documento importado é enviado a servidores ou compartilhado pela aplicação. O arquivo é lido no navegador e o texto extraído fica apenas na memória durante a importação. Os dados aplicados ao formulário são salvos automaticamente no `localStorage` deste navegador e permanecem após fechar ou recarregar a página. Use **Limpar meus dados** para apagá-los. Em dispositivo compartilhado, limpe os dados após o uso. O armazenamento do navegador não é criptografado pela aplicação. Não há APIs externas, análises nem fontes remotas.

## Requisitos e dependências

- Node.js 22.16+ e npm (os testes usam a remoção experimental de tipos do Node).
- React e React DOM: interface e estado do formulário.
- Vite e plugin oficial React: servidor local e build estático.
- TypeScript e tipos React: verificação de tipos.
- PDF.js (`pdfjs-dist`): extrai texto de PDFs no navegador usando worker incluído no projeto.
- Mammoth: extrai texto de DOCX no navegador. Nenhum HTML do arquivo é renderizado.

O ambiente atual não tinha Node.js. Foi extraído Node.js 22.16.0 apenas em `.tools/` dentro desta pasta, depois de conferir o SHA-256 publicado pelo projeto Node.js. Essa pasta é ignorada pelo Git. Em outro computador, use o Node.js já instalado e substitua o prefixo `PATH=...` dos comandos abaixo.

## Instalar e executar

Na pasta `/home/opc/curriculo-facil`:

```bash
PATH=/home/opc/curriculo-facil/.tools/bin:$PATH npm ci
PATH=/home/opc/curriculo-facil/.tools/bin:$PATH npm run dev
```

Abra `http://127.0.0.1:5173` no próprio servidor. O servidor Vite está configurado para escutar somente em `127.0.0.1`; ele não fica acessível pela internet diretamente.

Para acessar pelo celular conectado a um servidor remoto, mantenha `npm run dev` em execução e crie **um túnel SSH local no celular** com encaminhamento da porta local `5173` para `127.0.0.1:5173` no servidor. Em um cliente SSH que aceite comando de terminal, o equivalente é:

```bash
ssh -N -L 5173:127.0.0.1:5173 opc@ENDERECO_DO_SERVIDOR
```

Com o túnel ativo, abra `http://127.0.0.1:5173` no navegador do celular. Substitua `ENDERECO_DO_SERVIDOR` pelo endereço que você já usa para SSH. Se a porta local 5173 estiver ocupada, use outra à esquerda de `-L` e abra essa mesma porta no navegador. O túnel exige um aplicativo SSH no celular com suporte a encaminhamento de porta local; não é necessário abrir a porta 5173 no firewall do servidor.

## PDF

Preencha nome e e-mail válido, toque em **Exportar meu currículo** e, no diálogo de impressão, escolha **Salvar como PDF**. Use papel **A4** e escala padrão. Desative **Cabeçalhos e rodapés** nas opções de impressão do navegador para evitar data, endereço e número de página adicionados por ele. Revise todas as páginas da prévia antes de salvar. O CSS define A4, margens e quebras de conteúdo, mas não consegue controlar os cabeçalhos e rodapés gerados pelo navegador.

## Importar currículo

Toque em **Importar currículo** e escolha um PDF com texto selecionável ou um DOCX de até **5 MB**. A leitura acontece localmente. Na tela de revisão, confira e corrija os campos identificados; campos vazios aparecem como **Não reconhecido**. O formulário só recebe os dados após tocar em **Usar estes dados**. Se já houver dados salvos, a aplicação pede confirmação antes de substituí-los. Ao cancelar, o formulário atual permanece intacto.

PDFs digitalizados sem camada de texto, arquivos protegidos por senha, documentos inválidos e DOCX que expandem para tamanho excessivo mostram um erro. OCR e arquivos `.doc` antigos não são aceitos nesta etapa. A importação reconhece títulos como **Habilidades técnicas** como seção própria e mantém esse título na prévia e no PDF. Documentos com diagramação complexa ainda podem exigir ajustes manuais.

## Verificações

```bash
PATH=/home/opc/curriculo-facil/.tools/bin:$PATH npm run typecheck
PATH=/home/opc/curriculo-facil/.tools/bin:$PATH npm run build
PATH=/home/opc/curriculo-facil/.tools/bin:$PATH npm test
```

Os testes usam um PDF e um DOCX fictícios em `tests/fixtures/`, gerados por `tests/fixtures/generate.py`.

O projeto não é publicado automaticamente.
