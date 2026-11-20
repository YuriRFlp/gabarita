# ADR-012 — Barra lateral com ícones, item atual pelo fundo e tema só em Configurações

**Status:** aceito · **Data:** 2026-11-20 · **Origem:** pedido do dono durante a implementação da [SPEC-005](../specs/SPEC-005-configuracoes-e-pesos-dos-concursos.md) · **Substitui em parte:** [ADR-010](ADR-010-direcao-visual-folha-de-prova.md) (só os três pontos da casca listados abaixo; o restante do ADR-010 continua valendo)

> **Nota de status (2026-11-20):** substituído em parte pelo [ADR-013](ADR-013-cabecalho-de-pagina-sem-sobretitulo.md): deixa de valer a frase "a numeração do doc 01 continua no sobretítulo do cabeçalho de página ("Módulo 01"), que não muda", assim como a menção a "cabeçalho de página com sobretítulo" em "O que continua do ADR-010". O sobretítulo sai de todas as páginas, e a numeração do doc 01 não aparece mais na interface. O restante deste ADR continua valendo.

## Contexto
O ADR-010 definiu a casca da direção "Folha de prova": itens da barra lateral numerados como linhas da folha ("00 Início", "01 Mapa do edital"), o item atual com fundo `ink-light` e uma bolha preenchida no lugar do número, e o bloco "Aparência" (alternador de tema) junto de "Sair" no rodapé da barra. A SPEC-004 implementou isso (CA-36) e a SPEC-005 acrescentou a página Configurações, com uma seção "Aparência" que repete o alternador (P-9 da SPEC-005: "manter nos dois lugares", porque tirar da barra exigiria um ADR novo).

Com a página Configurações em uso, o dono pediu três mudanças na barra:
1. tirar o alternador de tema da barra: o tema passa a ser escolhido só em Configurações > Aparência;
2. o item atual deixa de trocar o número ou o ícone por uma bolha: mantém o ícone e é indicado só pela cor de fundo (com `aria-current="page"`);
3. "Início" e "Mapa do edital" trocam os números por ícones Lucide com traço de 2 px, como o link "Configurações" já faz.

Os três pontos contrariam o ADR-010, que está aceito; por isso este ADR os substitui de forma explícita, em vez de a implementação contorná-lo.

**Alerta de acessibilidade.** O critério WCAG 1.4.1 (uso da cor) não aceita a cor como único meio de distinguir um elemento quando a diferença entre as cores é pequena. A bolha do ADR-010 existia justamente para isso. Indicar o item atual só pelo fundo só é aceitável se esse fundo se destacar do fundo da barra com contraste de elemento gráfico (WCAG 1.4.11, 3:1): aí a diferença é de luminância perceptível, não só de matiz. Com os tokens de hoje, o fundo do item atual (`ink-light`) sobre o fundo da barra (`paper`) fica em **1,17:1 no tema claro e 1,41:1 no escuro** (medido sobre `design/tokens.json`), muito abaixo de 3:1. Manter `ink-light` violaria o critério.

## Decisão
A decisão do dono é mantida, com as condições de acessibilidade abaixo.

- **Itens da barra sem número.** "Início" usa o ícone `House` e "Mapa do edital" o ícone `Map` (Lucide, traço 2 px, `aria-hidden`), visíveis em todas as larguras, inclusive a partir de 1024 px (hoje o CSS esconde o ícone no desktop). Cada módulo futuro entra na barra com um ícone, sem número. A numeração do doc 01 continua no sobretítulo do cabeçalho de página ("Módulo 01"), que não muda. A classe `gb-shell__rail-number` e o campo `number` de `NavigationItem` deixam de existir.
- **Item atual indicado pelo fundo, mantendo o ícone.** Vale para a lista principal e para o link secundário ("Configurações"). Sem bolha, sem número e sem troca de ícone.
  - O fundo do item atual precisa ter **contraste mínimo de 3:1 com o fundo da barra (`paper`), nos dois temas**, verificado em `tests/design/contrast.test.ts`.
  - Com os tokens existentes, o par que cumpre isso é **fundo `ink` com texto e ícone em `on-ink`**, o mesmo tratamento da opção atual do grupo segmentado e dos filtros: `ink` sobre `paper` dá 10,44:1 (claro) e 7,87:1 (escuro); `on-ink` sobre `ink` dá 10,73:1 e 7,87:1. Nenhum token novo é criado. Se o dono preferir outro tom, ele precisa de um token novo que passe nos mesmos testes.
  - `aria-current="page"` continua no item atual, e só nele.
  - **Foco no item atual:** o anel de foco (`ink`) encostado num fundo `ink` só aumentaria o retângulo. No item atual, o foco ganha um intervalo de 2 px em `paper` antes do anel de 3 px em `ink` (`box-shadow` com as duas camadas, sem token novo). Assim o anel é medido contra `paper` (3:1).
  - **Modo de alto contraste (`forced-colors: active`):** o navegador apaga as cores de fundo. Por isso o item atual usa `forced-color-adjust: none` com `Highlight` e `HighlightText`, como `gb-segmented__option` já faz.
- **Tema só em Configurações.** O bloco "Aparência" (`gb-shell__appearance`, com o sobretítulo "Aparência" e o `ThemeToggle`) sai do rodapé da barra lateral e do menu do celular. O rodapé fica com o link "Configurações" e o botão "Sair". O `ThemeToggle` passa a existir só na seção "Aparência" de `/settings`, com o mesmo comportamento (`aria-pressed`, gravação em `settings.theme`, cookie e `revalidatePath('/', 'layout')`). Na tela de login, sem sessão, não há alternador (como hoje); o tema segue o do sistema ou o cookie.
- **Substituições registradas:** a bolha no item atual do ADR-010 e do CA-36 da SPEC-004 foi substituída pelo fundo `ink` com contraste de 3:1; os números dos itens da barra (ADR-010, CA-36 da SPEC-004) foram substituídos por ícones; "Aparência" no rodapé da barra (ADR-010) e a resposta da P-9 da SPEC-005 ("nos dois lugares") foram substituídas por "só em Configurações".

**O que continua do ADR-010:** direção plana sem sombras, réguas, raios, barra lateral fixa a partir de 1024 px com o botão "Menu" abaixo disso, marcas de sincronismo `aria-hidden`, cabeçalho de página com sobretítulo e régua, login em duas colunas, ornamentos contidos, números tabulares e a bolha como elemento-assinatura nas telas de estudo (alternativas, medidor de domínio, matriz, estados vazios).

## Alternativas consideradas
- **Manter a bolha no item atual (ADR-010):** é o indicador mais seguro para a WCAG 1.4.1 e reforça a assinatura. Descartada pelo dono: com ícones no lugar dos números, trocar o ícone pela bolha faz o item atual perder a identificação visual do módulo.
- **Manter `ink-light` como fundo do item atual:** é a aparência atual, mais suave. Descartada porque fica em 1,17:1 e 1,41:1 contra a barra: o item atual se distinguiria só pelo matiz, o que viola a WCAG 1.4.1.
- **Token novo de fundo, intermediário entre `ink-light` e `ink`:** daria um destaque mais suave que o `ink` cheio, mas cria token e par de contraste novos (o texto precisaria de 4,5:1 sobre ele nos dois temas), e o mesmo efeito já existe no grupo segmentado com `ink`. Descartada por simplicidade; fica como caminho se o dono achar o `ink` pesado demais.
- **`ink-light` com um indicador de forma** (régua lateral de 3 px em `ink`, sublinhado ou texto em negrito): cumpre a WCAG sem mudar o fundo, mas contraria o pedido do dono de indicar o item atual só pelo fundo. Descartada; é a alternativa a retomar se o `ink` cheio não agradar.
- **Manter o alternador nos dois lugares (P-9 original da SPEC-005):** acesso mais rápido ao tema, mas dois controles do mesmo estado na mesma tela podem ficar com valores diferentes até o próximo carregamento, e o rodapé da barra fica mais carregado. Descartada pelo dono: o tema é uma preferência rara, e o lugar dela é Configurações.
- **Manter os números ao lado dos ícones:** preserva a metáfora da folha óptica na barra, mas repete a informação do sobretítulo da página e ocupa largura. Descartada pelo dono.

## Consequências
- **Tema a um clique a mais:** escolher o tema passa a exigir abrir Configurações (no celular, abrir o menu e depois Configurações). Para uma preferência que muda raramente, o custo é aceito.
- **Testes de contraste:** em `tests/design/contrast.test.ts` entram os pares "fundo do item atual × fundo da barra" (`ink` × `paper`, mínimo 3:1), "texto e ícone do item atual" (`on-ink` × `ink`, 4,5:1) e "anel de foco do item atual sobre o intervalo" (`ink` × `paper`, 3:1), nos dois temas. Saem os pares que deixaram de existir: bolha do item atual (`ink` × `ink-light`), texto do item atual sobre `ink-light` e anel de foco sobre `ink-light`. O par `graphite-soft` × `paper` continua por causa do sobretítulo (deixa de citar os números da barra).
- **Documentos a atualizar** na implementação da SPEC-005 (que registra este ADR): doc 05 (seção "Direção visual", linha "Shell e navegação" e linha "Grupo segmentado"), glossário (sai `gb-shell__rail-number`, sai o bloco "Aparência" da barra, `gb-shell__appearance`), doc 07 (jornada 7: tema escolhido em `/settings`), `design/components.css` (classes da casca) e o runbook de implantação (checklist do CA-15 da SPEC-002: escolher "Escuro" em Configurações).
- **Specs concluídas:** os CAs da SPEC-001 (CA-25, CA-28) e da SPEC-004 (CA-36) que citam números, bolha ou alternador na casca não são reescritos, porque a spec concluída é registro histórico. Cada uma ganha uma nota no histórico apontando para este ADR, e os testes que os cobrem (jornadas 7 e 8, testes de `Shell`) passam a verificar o comportamento novo, rastreado aos CAs da SPEC-005.
- **Navegação futura:** cada módulo novo precisa de um ícone Lucide distinto. Se a barra chegar aos 9 módulos com ícones parecidos, o rótulo de texto continua sendo o identificador principal (os ícones são `aria-hidden`).
- Voltar a indicar o item atual por forma (bolha ou régua) ou devolver o alternador à barra exige um ADR novo que substitua este.
