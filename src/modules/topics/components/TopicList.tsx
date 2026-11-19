import Link from 'next/link';
import { HeaderHint, MasteryMeter, PriorityValue, Tag } from '@/shared/ui';
import type { TopicMapEntry } from '../domain';
import { PROFILE_LABELS } from './format';

const PRIORITY_HINT =
  'O quanto o assunto vale nos concursos que você escolheu: soma do peso de cada concurso × a incidência do assunto nele. Não depende das suas respostas.';
const MASTERY_HINT =
  'O quanto você já domina o assunto, a partir dos acertos sem chute nos últimos 60 dias (e, depois, dos cartões de revisão). A urgência de estudo é a prioridade × (1 − domínio).';
/** Below 768 px the head is visually hidden, so its titles must not be tab stops. */
const STACKED = '(max-width: 767.98px)';

/** Roles are explicit because the mobile CSS changes `display`, which makes some browsers drop the table semantics. */
export function TopicList({ entries }: { entries: ReadonlyArray<TopicMapEntry> }) {
  return (
    <table className="gb-topic-list" role="table">
      <caption className="gb-visually-hidden">Assuntos do edital</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            Assunto
          </th>
          <th scope="col" role="columnheader">
            <HeaderHint hint={PRIORITY_HINT} unfocusableWhen={STACKED}>
              Prioridade
            </HeaderHint>
          </th>
          <th scope="col" role="columnheader">
            <HeaderHint hint={MASTERY_HINT} alignEnd unfocusableWhen={STACKED}>
              Domínio
            </HeaderHint>
          </th>
          <th scope="col" role="columnheader">
            Subtópicos
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {entries.map(({ topic, priority, mastery }) => (
          <tr key={topic.id} role="row">
            <th scope="row" role="rowheader" className="gb-topic-list__name">
              <Link href={`/topics/${topic.id}`}>{topic.name}</Link>
              <span className="gb-topic-list__tags">
                <Tag>{topic.profile === null ? 'Geral' : PROFILE_LABELS[topic.profile]}</Tag>
                {topic.phase === 'post_notice' ? <Tag variant="phase">Pós-edital</Tag> : null}
              </span>
            </th>
            <td role="cell" data-label="Prioridade">
              <PriorityValue value={priority.priority} />
            </td>
            <td role="cell" data-label="Domínio">
              <MasteryMeter value={mastery.kind === 'measured' ? mastery.value : null} />
            </td>
            <td role="cell" data-label="Subtópicos" className="gb-topic-list__count">
              {topic.subtopics.length}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
