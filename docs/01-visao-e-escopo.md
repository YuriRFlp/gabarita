# 01 — Visão e escopo

## Nome

**Gabarita.** Nome curto e com cara de concurso: gabaritar é o objetivo de toda prova.

## Objetivo

O Gabarita apoia a preparação para o cargo de **Analista Judiciário — Tecnologia da Informação** em tribunais, com três prioridades:

1. **Retenção**: revisão espaçada (FSRS) para lembrar o conteúdo no dia da prova.
2. **Direção**: estudar primeiro o que mais cai nos concursos-alvo e onde há mais erro.
3. **Prática no formato real**: questões e simulados no formato de cada banca, e discursivas corrigidas pela rubrica da banca.

## Usuário

Uso pessoal, um único usuário. Perfil: desenvolvimento/sistemas, com lacuna em infraestrutura. Disponibilidade: 3 horas por dia, 21 horas por semana.

## Concursos-alvo e pesos

| Concurso | Banca (último) | Peso | Motivo |
|---|---|---|---|
| TRT-3 (MG) | Fumarc 2022 | 0,40 | Alvo principal; novo concurso autorizado em out/2026 |
| TRF-6 (MG) | Cebraspe 2024 | 0,25 | Federal em MG; perfil de Análise de Sistemas |
| TJMG | IBFC 2022 | 0,20 | Estadual em MG; sem previsão para TI |
| TRT-4 (RS) | FCC 2026 | 0,15 | Edital mais recente; referência de FCC |

Os pesos ficam na tabela `concursos.peso_alvo` e podem ser alterados a qualquer momento.

## Módulos do MVP

| # | Módulo | Resumo |
|---|---|---|
| 1 | Mapa do edital | Taxonomia, incidência por concurso, prioridade e domínio por assunto |
| 2 | Banco de questões | Importação de provas reais e questões inéditas; múltipla escolha e Certo/Errado; registro de confiança |
| 3 | Revisão espaçada | Cartões FSRS criados de erros, dúvidas e conceitos; fila diária |
| 4 | Ciclo e cronograma | Sessão diária: revisões vencidas, depois leitura e questões do assunto da vez |
| 5 | Simulados | Formato exato de cada banca, com cronômetro e regras de aprovação |
| 6 | Discursivas | Redação geral e estudo de caso; correção pela rubrica da banca |
| 7 | Painel de desempenho | Acerto por assunto e banca, assuntos em queda, cumprimento do cronograma |
| 8 | Configuração de IA | Modos desligado, manual (padrão) e API (previsto) |
| 9 | Material de estudo | Resumo em Markdown, mapa mental (Markmap), links oficiais, anotações, geração de cartões |

## Fora do MVP

- Leitura de redação manuscrita por foto (OCR).
- Modo de IA via API (a arquitetura já prevê; ver ADR-002).
- Importação automática e em massa de provas.
- Concursos fora dos tribunais.
- Multiusuário.

## Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Banco de questões começa pequeno | Importar provas reais aos poucos; completar com questões inéditas |
| Resumos gerados por IA podem conter erros | Campo `materiais.verificado`, link para fonte oficial em cada subtópico |
| Normas mudam de versão entre editais | Subtópicos indicam versão; revisar a taxonomia a cada novo edital |
| Banca do próximo TRT-3 indefinida | Fase pré-edital neutra quanto à banca; especializar após o edital |
