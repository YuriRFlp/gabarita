import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Shell } from './Shell';

const navigation = [
  { label: 'Início', href: '/', icon: <svg aria-hidden="true" /> },
  { label: 'Questões', href: '/questions', icon: <svg aria-hidden="true" /> },
];

function renderShell(currentPath = '/') {
  return render(
    <Shell
      logo={<span>Gabarita</span>}
      navigation={navigation}
      currentPath={currentPath}
      actions={<button type="button">Sair</button>}
    >
      <h1>Início</h1>
    </Shell>,
  );
}

describe('Shell', () => {
  it('has the skip link as the first focusable element', async () => {
    renderShell();
    await userEvent.tab();
    const skipLink = screen.getByRole('link', { name: 'Pular para o conteúdo' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#content');
  });

  it('puts the content in main with id content', () => {
    renderShell();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'content');
    expect(main).toContainElement(screen.getByRole('heading', { level: 1, name: 'Início' }));
  });

  it('renders the logo as a link to the home page', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Gabarita' })).toHaveAttribute('href', '/');
  });

  it('marks only the current page item with aria-current="page"', () => {
    renderShell('/questions');
    const mainNavigation = screen.getByRole('navigation', { name: 'Principal' });
    expect(mainNavigation).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Questões' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });

  it('also marks the item on its subpages, without marking home', () => {
    renderShell('/questions/123');
    expect(screen.getByRole('link', { name: 'Questões' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });

  it('starts with the Menu button collapsed, controlling the list with navigation and actions', () => {
    renderShell();
    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const list = document.getElementById(button.getAttribute('aria-controls') ?? '');
    expect(list).not.toHaveClass('gb-shell__menu--open');
    expect(list).toContainElement(screen.getByRole('navigation', { name: 'Principal' }));
    expect(list).toContainElement(screen.getByRole('button', { name: 'Sair' }));
  });

  it('opens and closes the menu with the button', async () => {
    renderShell();
    const button = screen.getByRole('button', { name: 'Menu' });
    const list = document.getElementById(button.getAttribute('aria-controls') ?? '');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(list).toHaveClass('gb-shell__menu--open');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the open menu on Esc and returns focus to the button', async () => {
    renderShell();
    const button = screen.getByRole('button', { name: 'Menu' });
    await userEvent.click(button);
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Início' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes the menu when the current page changes', async () => {
    const { rerender } = renderShell('/');
    const button = screen.getByRole('button', { name: 'Menu' });
    await userEvent.click(button);
    rerender(
      <Shell
        logo={<span>Gabarita</span>}
        navigation={navigation}
        currentPath="/questions"
        actions={<button type="button">Sair</button>}
      >
        <h1>Questões</h1>
      </Shell>,
    );
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});
