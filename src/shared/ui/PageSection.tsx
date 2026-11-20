import type { ReactNode } from 'react';

export type PageSectionProps = {
  /** Anchor for links such as `#exam-weights`; also names the section for screen readers. */
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function PageSection({ id, title, description, children }: PageSectionProps) {
  const titleId = `${id}-title`;
  return (
    <section id={id} className="gb-page-section" aria-labelledby={titleId}>
      <header className="gb-page-section__header">
        <h2 id={titleId} className="gb-page-section__title">
          {title}
        </h2>
        {description !== undefined && <p className="gb-page-section__description">{description}</p>}
      </header>
      <div className="gb-page-section__body">{children}</div>
    </section>
  );
}
