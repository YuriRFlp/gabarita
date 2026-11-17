'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/shared/ui';

type ErrorPageProps = { error: Error & { digest?: string }; reset: () => void };

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="gb-error-page">
      <h1>Algo deu errado</h1>
      <p>Não foi possível carregar esta página.</p>
      <Button onClick={reset} icon={<RotateCcw aria-hidden />}>
        Tentar de novo
      </Button>
    </main>
  );
}
