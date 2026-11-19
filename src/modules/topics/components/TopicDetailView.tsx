import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Bubble, EmptyState, MasteryMeter, Notice, Tag } from '@/shared/ui';
import { formatShare } from '@/shared/utils/format';
import type { Exam, Mastery, TopicMapEntry } from '../domain';
import { INCIDENCE_SHORT_LABELS, PROFILE_LABELS, bubbleFillFor, formatPercent } from './format';
import type { LoadOutcome } from './load-outcome';
import { TOPICS_PATH } from './TopicMapFilters';

export type TopicDetail = { entry: TopicMapEntry; exams: ReadonlyArray<Exam> };

export type TopicDetailViewProps = {
  result: LoadOutcome<TopicDetail>;
  /** Address of the current page, for "Tentar de novo". */
  retryHref: string;
};

function BackLink() {
  return (
    <Link href={TOPICS_PATH} className="gb-back-link">
      <ArrowLeft aria-hidden="true" strokeWidth={2} />
      Mapa do edital
    </Link>
  );
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function MasterySection({ mastery }: { mastery: Mastery }) {
  if (mastery.kind === 'no_answers') {
    return (
      <EmptyState title="Você ainda não respondeu questões deste assunto nos últimos 60 dias.">
        <p>Para a urgência, o domínio conta como 0.</p>
      </EmptyState>
    );
  }
  return (
    <div className="gb-detail-mastery">
      <MasteryMeter value={mastery.value} />
      <p>
        {plural(mastery.answered, 'resposta', 'respostas')},{' '}
        {plural(mastery.firmCorrect, 'acerto firme', 'acertos firmes')} (chutes não contam).
      </p>
      <p>
        Retenção média:{' '}
        {mastery.averageRetention === null
          ? 'ainda não calculada.'
          : `${formatPercent(mastery.averageRetention)}.`}
      </p>
      {mastery.averageRetention === null ? (
        <p>Sem cartões, o domínio é a taxa de acerto firme.</p>
      ) : null}
    </div>
  );
}

export function TopicDetailView({ result, retryHref }: TopicDetailViewProps) {
  if (!result.ok) {
    return (
      <>
        <BackLink />
        <header className="gb-page-header">
          <hgroup>
            <p className="gb-page-header__eyebrow">Assunto</p>
            <h1 className="gb-page-header__title">Mapa do edital</h1>
          </hgroup>
        </header>
        <Notice kind="error">
          <p>Não foi possível carregar o mapa do edital. Tente de novo em instantes.</p>
          <Link href={retryHref}>Tentar de novo</Link>
        </Notice>
      </>
    );
  }

  const { entry } = result.value;
  const { topic, priority, mastery, urgency } = entry;

  return (
    <>
      <BackLink />
      <header className="gb-page-header">
        <hgroup>
          <p className="gb-page-header__eyebrow">Assunto</p>
          <h1 className="gb-page-header__title">{topic.name}</h1>
        </hgroup>
        <p className="gb-topic-detail__tags">
          <Tag>{topic.profile === null ? 'Geral' : PROFILE_LABELS[topic.profile]}</Tag>
          {topic.phase === 'post_notice' ? <Tag variant="phase">Pós-edital</Tag> : null}
        </p>
      </header>
      <p className="gb-topic-detail__summary">
        Prioridade {formatShare(priority.priority)} · Urgência {formatShare(urgency)} · Domínio:{' '}
        {mastery.kind === 'measured' ? formatPercent(mastery.value) : 'sem respostas'}
      </p>

      <section className="gb-topic-detail__section" aria-labelledby="topic-priority">
        <h2 id="topic-priority">Prioridade</h2>
        <p>Prioridade = soma de peso × incidência em cada concurso ativo.</p>
        <table className="gb-contributions">
          <caption className="gb-visually-hidden">
            Contribuição de cada concurso para a prioridade
          </caption>
          <thead>
            <tr>
              <th scope="col">Concurso</th>
              <th scope="col">Incidência</th>
              <th scope="col">Contribuição</th>
            </tr>
          </thead>
          <tbody>
            {priority.contributions.map(({ exam, incidence, contribution, counted }) => (
              <tr key={exam.id}>
                <th scope="row">
                  {exam.court} · {exam.examBoardName} {exam.year} · peso{' '}
                  {formatShare(exam.targetWeight)}
                  {counted ? null : <Tag>Inativo</Tag>}
                </th>
                <td>
                  <span className="gb-contributions__incidence">
                    <Bubble fill={bubbleFillFor(incidence)} size="small" />
                    {INCIDENCE_SHORT_LABELS[incidence]}
                  </span>
                </td>
                <td className="gb-contributions__value">
                  {counted ? formatShare(contribution) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total
              </th>
              <td className="gb-contributions__value">{formatShare(priority.priority)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="gb-topic-detail__section" aria-labelledby="topic-mastery">
        <h2 id="topic-mastery">Domínio</h2>
        <MasterySection mastery={mastery} />
      </section>

      <section className="gb-topic-detail__section" aria-labelledby="topic-subtopics">
        <h2 id="topic-subtopics">Subtópicos ({topic.subtopics.length})</h2>
        <ol className="gb-subtopics">
          {topic.subtopics.map((subtopic) => (
            <li key={subtopic.id}>{subtopic.name}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
