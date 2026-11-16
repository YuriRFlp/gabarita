# SPEC-NNN — Nome da funcionalidade

**Status:** rascunho · **Criada:** AAAA-MM-DD · **Atualizada:** AAAA-MM-DD
**Módulo:** `src/modulos/<modulo>` · **ADRs relacionados:** —

## 1. Objetivo
O problema que resolve e para quem, em 2 ou 3 frases.

## 2. Regras de origem
Regras que esta funcionalidade implementa, citando o documento (ex.: `docs/04-regras-de-estudo.md` § Criação automática de cartões). Não reescreva a regra aqui; cite-a e registre apenas interpretações ou esclarecimentos.

## 3. Escopo
**Dentro:**
-

**Fora (fica para depois):**
-

## 4. Critérios de aceite
Cada critério é verificável e vira pelo menos um teste (coluna "Teste").

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-1 | Dado …, quando …, então … | unitário · pgTAP · E2E |

## 5. Design técnico

### 5.1 Arquivos por camada
| Camada | Arquivo | Criar/Alterar | Responsabilidade |
|---|---|---|---|
| dominio | | | |
| dados | | | |
| acoes | | | |
| componentes | | | |
| app | | | |

### 5.2 Contratos
Assinaturas das funções de domínio, esquemas Zod e o que o `index.ts` do módulo exporta.

```ts
```

### 5.3 Banco
Migração nova (nome), tabelas/colunas, políticas RLS, índices, impacto nas visões. "Nenhuma mudança" se for o caso.

### 5.4 Interface
Telas e estados (carregando, vazio, erro, sucesso), componentes do design system usados ou novos, comportamento no celular, atalhos de teclado.

## 6. Plano de testes
| Nível | O que cobre | Critérios |
|---|---|---|
| Unitário | | CA-… |
| Componente | | |
| pgTAP | | |
| E2E | Jornada … | |

## 7. Riscos e alternativas descartadas
-

## 8. Perguntas em aberto
Itens que precisam de resposta do dono do projeto antes da aprovação. A spec não é aprovada com perguntas bloqueantes em aberto.

## 9. Histórico
| Data | Mudança |
|---|---|
| AAAA-MM-DD | Criação |
