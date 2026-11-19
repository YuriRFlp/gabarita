import Link from 'next/link';
import { MasteryMeter, PriorityValue, Tag } from '@/shared/ui';
import type { TopicMapEntry } from '../domain';
import { PROFILE_LABELS } from './format';

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
            Prioridade
          </th>
          <th scope="col" role="columnheader">
            Domínio
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
