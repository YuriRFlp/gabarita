import type { Metadata } from 'next';
import { Logo } from '@/app/logo';
import { LoginForm } from '@/modules/auth';
import { Bubble } from '@/shared/ui';

export const metadata: Metadata = { title: 'Entrar' };

type LoginPageProps = { searchParams: Promise<{ next?: string | string[] }> };

// The three priorities of the product (docs/01 § Visão), drawn as rows of the answer sheet.
const SHEET_ROWS = [
  { number: '01', marked: 0, label: 'Retenção com revisão espaçada' },
  { number: '02', marked: 1, label: 'Direção pelo que mais cai' },
  { number: '03', marked: 2, label: 'Prática no formato da banca' },
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  return (
    <main className="gb-login">
      <div className="gb-login__panel gb-sheet-texture">
        <div className="gb-timing-marks" aria-hidden="true" />
        <Logo />
        <p className="gb-eyebrow">Analista Judiciário · Tecnologia da Informação</p>
        <p className="gb-login__promise">Estude o que cai. Lembre no dia da prova.</p>
        <ol className="gb-login__sheet-rows">
          {SHEET_ROWS.map((row) => (
            <li key={row.number}>
              <span className="gb-login__row-number" aria-hidden="true">
                {row.number}
              </span>
              <span className="gb-login__row-bubbles" aria-hidden="true">
                {[0, 1, 2].map((column) => (
                  <Bubble
                    key={column}
                    size="small"
                    fill={column === row.marked ? 'filled' : 'empty'}
                  />
                ))}
              </span>
              <span>{row.label}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="gb-login__form">
        <h1>Entrar</h1>
        <LoginForm next={typeof next === 'string' ? next : undefined} />
      </div>
    </main>
  );
}
