# Specs — planos técnicos por funcionalidade

Cada funcionalidade do Gabarita tem uma spec registrada aqui **antes** de ser implementada. A spec é o contrato entre o que se pediu, o que se constrói e o que se testa.

## Convenções

- Arquivo: `SPEC-NNN-nome-da-funcionalidade.md` (numeração sequencial, nome em kebab-case, sem acento).
- Partir sempre do [modelo](_modelo.md).
- Redigida pelo agente `arquiteto`; aprovada pelo dono do projeto.
- Spec nunca é apagada. Funcionalidade abandonada recebe o status `cancelada`; mudança grande de rumo gera uma nova spec que substitui a anterior.
- Mudança de escopo durante a implementação **atualiza a spec primeiro** e registra a alteração no histórico dela.
- Decisão com alternativas razoáveis que vale para além da funcionalidade vira ADR (`docs/adr/`); a spec apenas o cita.

## Ciclo de vida

| Status | Significado | Quem muda |
|---|---|---|
| `rascunho` | Em elaboração ou aguardando aprovação | arquiteto |
| `aprovada` | Pode ser implementada | dono do projeto |
| `em-implementacao` | Código em andamento | quem começa a implementar |
| `concluida` | Definição de pronto cumprida e revisão aprovada | quem fecha a tarefa |
| `cancelada` | Não será feita (motivo no histórico) | dono do projeto |

Código só começa com a spec `aprovada`.

## Índice

| Spec | Funcionalidade | Status |
|---|---|---|
| [SPEC-001](SPEC-001-fundacao-da-aplicacao.md) | Fundação da aplicação (scaffold, ferramentas, CI, Supabase local, autenticação, design system com tema sincronizado, casca) | concluida |
| [SPEC-002](SPEC-002-implantacao.md) | Implantação (Supabase remoto, Vercel, migrações com guardas, cadastro desligado, usuário real, cabeçalhos de segurança, backup e ensaio de restauração, runbooks) | concluida |
| [SPEC-003](SPEC-003-backup-chave-publica-e-copia-na-nuvem.md) | Backup com chave pública do gpg (sem senha ao fazer backup) e cópia automática do `.gpg` para a pasta sincronizada do Google Drive, com guardas e retenção; `backup:verify` a partir do `.gpg` | rascunho (adiada) |
| [SPEC-004](SPEC-004-mapa-do-edital.md) | Mapa do edital (módulo 1): taxonomia, incidência por concurso, prioridade e domínio por assunto, matriz de incidência, detalhe do assunto; redesenho da casca e do login na direção visual "Folha de prova" (ADR-010); perguntas respondidas, implementado e revisado | concluida |
| [SPEC-005](SPEC-005-configuracoes-e-pesos-dos-concursos.md) | Configurações (página extensível em seções): pesos dos concursos por usuário com soma de 100%, redistribuição e restauração do padrão (tabela `exam_weights`, ADR-011), concurso-alvo e "edital publicado", efeito no mapa do edital; plano de implantação com o seed da SPEC-004 | concluida |
| [SPEC-006](SPEC-006-banco-de-questoes.md) | Banco de questões (módulo 2): escopo da prática por assunto (banca × tipo de órgão, em camadas) e como alimentar o banco (provas reais com extração pelo modo de IA manual, inéditas só para lacunas); só objetivo, regras de origem e perguntas em aberto | rascunho (esqueleto) |
