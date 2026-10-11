"""Gera documentos pequenos com dados fictícios para os testes de importação."""
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).parent
COMPLEX = [
    'Lívia Monteiro', 'Analista de Dados', 'livia@exemplo.com',
    'EXPERIÊNCIAS PROFISSIONAIS',
    'Analista Sênior', 'Empresa Aurora | Sorocaba/SP', 'março de 2025 – atual', 'Liderei análises e documentei resultados.',
    'Analista Pleno', 'Empresa Horizonte | Campinas, SP', 'janeiro de 2023 – fevereiro de 2025', 'Criei relatórios.',
    'Analista Júnior | Empresa Cedro | Recife, PE | 2021 – 2022', 'Acompanhei indicadores.',
    'Assistente | Empresa Lago | 2020 – 2021', 'Organizei arquivos.',
    'Estagiária | Empresa Vento | 2019 – 2020', 'Participei de projetos.',
    'FORMAÇÃO ACADÊMICA',
    'Bacharelado em Estatística | Universidade Modelo | 2015 – 2019',
    'Especialização em Dados | Instituto Exemplo | 2020 – 2021',
    'CERTIFICAÇÕES', 'Certificação em Análise — Escola Aberta, 2024',
    'IDIOMAS', 'Inglês — avançado', 'Espanhol — intermediário',
]
LINES = [
    "Ana Carolina Silva",
    "Analista de Marketing",
    "ana.silva@exemplo.com | (11) 99999-8888 | Sao Paulo, SP",
    "Objetivo profissional",
    "Atuar em marketing digital com foco em campanhas e relacionamento.",
    "Experiencia profissional",
    "Analista de Marketing - Empresa Alfa | 2022 - Atual",
    "Planejamento de campanhas e analise de resultados.",
    "",
    "Assistente de Marketing - Empresa Beta | 2020 - 2022",
    "Criacao de conteudo e apoio a eventos.",
    "Formacao academica",
    "Bacharelado em Administracao - Universidade Exemplo | 2016 - 2020",
    "",
    "Tecnico em Comunicacao - Escola Modelo | 2013 - 2015",
    "Habilidades",
    "Excel, comunicacao, campanhas digitais",
]

MULTI_PAGES = [
    [
        "Mariana Costa",
        "Engenheira de Software",
        "mariana.costa@exemplo.com | (21) 98888-7777 | Rio de Janeiro, RJ",
        "RESUMO PROFISSIONAL",
        "Experiencia em desenvolvimento de produtos digitais e lideranca tecnica.",
        "EXPERIENCIA PROFISSIONAL",
        "Engenheira de Software Senior",
        "Empresa Aurora | Sao Paulo, SP",
        "marco de 2025 - atual",
        "Responsavel por arquitetura de servicos e mentoria de equipes.",
        "Implementei melhorias de desempenho e documentei processos.",
        "Liderei revisoes de codigo e planejei entregas com varias equipes.",
        "Atuei com seguranca, testes e observabilidade.",
        "Desenvolvi integracoes e acompanhei indicadores do produto.",
        "Organizei treinamento interno e reduzi tarefas repetitivas.",
    ],
    [
        "Analista de Sistemas",
        "Empresa Horizonte | Curitiba, PR",
        "janeiro de 2021 - fevereiro de 2025",
        "Responsavel por manutencao de sistemas internos.",
        "Criei relatorios para as areas de operacoes e suporte.",
        "Documentei requisitos e acompanhei entregas mensais.",
        "Desenvolvedora Junior | Empresa Sol",
        "2019 - 2020",
        "Desenvolvi telas e corrigi defeitos em aplicacoes web.",
        "FORMACAO ACADEMICA",
        "Bacharelado em Ciencia da Computacao",
        "Universidade Modelo | Belo Horizonte, MG",
        "2015 - 2019",
        "Projeto final sobre acessibilidade em interfaces web.",
        "Pos-graduacao em Engenharia de Software | Instituto Exemplo | 2020 - 2021",
        "CERTIFICACOES",
        "Certificacao em Arquitetura de Software - Escola Aberta, 2024",
        "IDIOMAS",
        "Ingles - avancado",
        "Espanhol - intermediario",
        "HABILIDADES",
        "TypeScript, testes automatizados, arquitetura",
    ],
]


def make_docx():
    paragraphs = "".join(
        f"<w:p><w:r><w:t>{escape(line)}</w:t></w:r></w:p>" if line else "<w:p/>"
        for line in LINES
    )
    document = f'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{paragraphs}</w:body></w:document>'
    content_types = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    with ZipFile(ROOT / "curriculo-ficticio.docx", "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        archive.writestr("word/document.xml", document)
    complex_paragraphs = ''.join(f'<w:p><w:r><w:t>{escape(line)}</w:t></w:r></w:p>' for line in COMPLEX)
    with ZipFile(ROOT / 'curriculo-complexo.docx', 'w', ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', content_types)
        archive.writestr('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        archive.writestr('word/document.xml', f'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{complex_paragraphs}</w:body></w:document>')


def make_pdf(lines=LINES, filename='curriculo-ficticio.pdf'):
    commands = ["BT", "/F1 11 Tf"]
    y = 775
    for line in lines:
        if not line:
            y -= 12
            continue
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        commands.extend([f"1 0 0 1 50 {y} Tm", f"({safe}) Tj"])
        y -= 18
    commands.append("ET")
    stream = "\n".join(commands).encode("cp1252")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Root 1 0 R /Size {len(objects) + 1} >>\nstartxref\n{xref}\n%%EOF\n".encode())
    (ROOT / filename).write_bytes(pdf)


def make_multi_pdf():
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b"", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    page_ids = []
    for page_lines in MULTI_PAGES:
        page_id = len(objects) + 1
        content_id = page_id + 1
        page_ids.append(page_id)
        commands = ["BT", "/F1 11 Tf"]
        y = 775
        for line in page_lines:
            safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            commands.extend([f"1 0 0 1 50 {y} Tm", f"({safe}) Tj"])
            y -= 18
        commands.append("ET")
        stream = "\n".join(commands).encode("ascii")
        objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>".encode())
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream")
    objects[1] = f"<< /Type /Pages /Kids [{' '.join(f'{number} 0 R' for number in page_ids)}] /Count {len(page_ids)} >>".encode()
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Root 1 0 R /Size {len(objects) + 1} >>\nstartxref\n{xref}\n%%EOF\n".encode())
    (ROOT / "curriculo-ficticio-multipagina.pdf").write_bytes(pdf)
    (ROOT / "curriculo-ficticio-multipagina.txt").write_text("\n\f\n".join("\n".join(page) for page in MULTI_PAGES))


if __name__ == "__main__":
    make_docx()
    make_pdf()
    make_pdf(COMPLEX, 'curriculo-complexo.pdf')
    make_multi_pdf()
