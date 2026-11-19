export default function TopicsLoading() {
  return (
    <div aria-busy="true">
      <header className="gb-page-header">
        <hgroup>
          <p className="gb-page-header__eyebrow">Módulo 01</p>
          <h1 className="gb-page-header__title">Mapa do edital</h1>
        </hgroup>
      </header>
      <p role="status">Carregando o mapa do edital…</p>
    </div>
  );
}
