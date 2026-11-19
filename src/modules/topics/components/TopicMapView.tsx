import Link from 'next/link';
import { EmptyState, Notice } from '@/shared/ui';
import type { TopicMap, TopicMapQuery } from '../domain';
import { IncidenceMatrix } from './IncidenceMatrix';
import { TopicList } from './TopicList';
import { TopicMapFilters, TOPICS_PATH, buildTopicMapHref } from './TopicMapFilters';
import type { LoadOutcome } from './load-outcome';

export type TopicMapViewProps = {
  result: LoadOutcome<TopicMap>;
  query: TopicMapQuery;
};

export function TopicMapView({ result, query }: TopicMapViewProps) {
  if (!result.ok) {
    return (
      <>
        <header className="gb-page-header">
          <hgroup>
            <p className="gb-page-header__eyebrow">Módulo 01</p>
            <h1 className="gb-page-header__title">Mapa do edital</h1>
          </hgroup>
        </header>
        <Notice kind="error">
          <p>Não foi possível carregar o mapa do edital. Tente de novo em instantes.</p>
          <Link href={buildTopicMapHref(query)}>Tentar de novo</Link>
        </Notice>
      </>
    );
  }

  const map = result.value;
  const { totals } = map;
  const hasTaxonomy = totals.topics > 0;

  return (
    <>
      <header className="gb-page-header">
        <hgroup>
          <p className="gb-page-header__eyebrow">Módulo 01</p>
          <h1 className="gb-page-header__title">Mapa do edital</h1>
        </hgroup>
        <p className="gb-page-header__meta">
          {totals.topics} assuntos · {totals.subtopics} subtópicos · {totals.exams} concursos
        </p>
      </header>

      {hasTaxonomy ? (
        <div className="gb-topic-map">
          {totals.measured === 0 ? (
            <Notice kind="info">
              <p>
                <strong>Domínio ainda não medido.</strong> Ele começa em 0 e passa a ser calculado
                quando houver respostas nos últimos 60 dias.
              </p>
            </Notice>
          ) : null}
          <TopicMapFilters query={map.query} />
          <p aria-live="polite" className="gb-topic-map__count">
            Mostrando {totals.shown} de {totals.topics} assuntos
          </p>
          {map.entries.length === 0 ? (
            <EmptyState
              title="Nenhum assunto com esses filtros."
              action={
                <Link className="gb-button gb-button--secondary" href={TOPICS_PATH}>
                  Limpar filtros
                </Link>
              }
            />
          ) : map.query.view === 'matrix' ? (
            <IncidenceMatrix entries={map.entries} exams={map.exams} />
          ) : (
            <TopicList entries={map.entries} />
          )}
        </div>
      ) : (
        <EmptyState title="A taxonomia ainda não foi carregada." />
      )}
    </>
  );
}
