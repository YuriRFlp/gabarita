import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="gb-error-page">
      <h1>Página não encontrada</h1>
      <p>O endereço pode estar errado ou a página ainda não existe.</p>
      <Link href="/" className="gb-button gb-button--primary">
        Voltar ao início
      </Link>
    </main>
  );
}
