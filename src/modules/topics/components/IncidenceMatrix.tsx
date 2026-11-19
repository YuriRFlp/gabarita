import Link from 'next/link';
import { Bubble } from '@/shared/ui';
import type { Exam, IncidenceValue, TopicMapEntry } from '../domain';
import { INCIDENCE_LONG_LABELS, bubbleFillFor, formatWeight, shortCourt } from './format';

const LEGEND_VALUES: ReadonlyArray<IncidenceValue> = [1, 0.5, 0];

export type IncidenceMatrixProps = {
  entries: ReadonlyArray<TopicMapEntry>;
  exams: ReadonlyArray<Exam>;
};

export function IncidenceMatrix({ entries, exams }: IncidenceMatrixProps) {
  return (
    <div className="gb-matrix-block">
      <ul className="gb-matrix-legend" aria-label="Legenda das bolhas">
        {LEGEND_VALUES.map((value) => (
          <li key={value}>
            <Bubble fill={bubbleFillFor(value)} size="small" />
            <span>{INCIDENCE_LONG_LABELS[value]}</span>
          </li>
        ))}
      </ul>
      <div
        className="gb-matrix"
        role="region"
        aria-label="Matriz de incidência por concurso"
        tabIndex={0}
      >
        <table className="gb-matrix__table">
          <caption className="gb-matrix__caption">
            Incidência de cada assunto em cada concurso
          </caption>
          <thead>
            <tr>
              <th scope="col" className="gb-matrix__corner">
                Assunto
              </th>
              {exams.map((exam) => (
                <th scope="col" key={exam.id} className="gb-matrix__exam">
                  <span aria-hidden="true">{shortCourt(exam.court)}</span>
                  <span aria-hidden="true" className="gb-matrix__weight">
                    {formatWeight(exam.targetWeight)}
                  </span>
                  <span className="gb-visually-hidden">
                    {`${exam.court}, ${exam.examBoardName} ${exam.year}, peso ${formatWeight(exam.targetWeight)}`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(({ topic, priority }) => (
              <tr key={topic.id}>
                <th scope="row" className="gb-matrix__topic">
                  <Link href={`/topics/${topic.id}`}>{topic.name}</Link>
                </th>
                {exams.map((exam) => {
                  const incidence =
                    priority.contributions.find((item) => item.exam.id === exam.id)?.incidence ?? 0;
                  return (
                    <td key={exam.id} className="gb-matrix__cell">
                      <Bubble fill={bubbleFillFor(incidence)} size="small" />
                      <span className="gb-visually-hidden">{INCIDENCE_LONG_LABELS[incidence]}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
