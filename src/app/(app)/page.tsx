import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Início' };

export default function HomePage() {
  return (
    <>
      <h1>Início</h1>
      <p>Os módulos de estudo aparecem aqui conforme forem entregues.</p>
    </>
  );
}
