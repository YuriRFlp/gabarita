import Link from 'next/link';
import { MasteryMeter, PriorityValue, Tag } from '@/shared/ui';
import type { TopicMapEntry } from '../domain';
import { PROFILE_LABELS } from './format';

export function TopicList({ entries }: { entries: ReadonlyArray<TopicMapEntry> }) {
  return (
    <table className="gb-topic-list">
      <caption className="gb-visually-hidden">Assuntos do edital</caption>
      <thead>
        <tr>
          <th scope="col">Assunto</th>
          <th scope="col">Prioridade</th>
          <th scope="col">Domínio</th>
          <th scope="col">Subtópicos</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(({ topic, priority, mastery }) => (
          <tr key={topic.id}>
            <th scope="row" className="gb-topic-list__name">
              <Link href={`/topics/${topic.id}`}>{topic.name}</Link>
              <span className="gb-topic-list__tags">
                <Tag>{topic.profile === null ? 'Geral' : PROFILE_LABELS[topic.profile]}</Tag>
                {topic.phase === 'post_notice' ? <Tag variant="phase">Pós-edital</Tag> : null}
              </span>
            </th>
            <td data-label="Prioridade">
              <PriorityValue value={priority.priority} />
            </td>
            <td data-label="Domínio">
              <MasteryMeter value={mastery.kind === 'measured' ? mastery.value : null} />
            </td>
            <td data-label="Subtópicos" className="gb-topic-list__count">
              {topic.subtopics.length}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
