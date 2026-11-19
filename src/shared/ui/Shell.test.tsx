import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Shell } from './Shell';

const navigation = [
  { number: '00', label: 'Início', href: '/', icon: <svg aria-hidden="true" /> },
  { number: '02', label: 'Questões', href: '/questions', icon: <svg aria-hidden="true" /> },
];

function railNumber(link: HTMLElement): Element {
  const number = link.querySelector('.gb-shell__rail-number');
  if (!number) throw new Error('Item without rail number.');
  return number;
}

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

  it('numbers the items like rows of the sheet, keeping the number out of the accessible name', () => {
    renderShell('/');
    const questions = screen.getByRole('link', { name: 'Questões' });
    expect(railNumber(questions)).toHaveTextContent('02');
    expect(railNumber(questions)).toHaveAttribute('aria-hidden', 'true');
    expect(questions).toHaveAccessibleName('Questões');
  });

  it('swaps the number of the current item for a filled bubble, so it is not marked by color only', () => {
    renderShell('/questions');
    const current = railNumber(screen.getByRole('link', { name: 'Questões' }));
    expect(current).not.toHaveTextContent('02');
    expect(current.querySelector('.gb-bubble')).toHaveClass(
      'gb-bubble--filled',
      'gb-bubble--small',
    );
    const other = railNumber(screen.getByRole('link', { name: 'Início' }));
    expect(other).toHaveTextContent('00');
    expect(other.querySelector('.gb-bubble')).toBeNull();
  });

  it('renders the timing marks hidden from screen readers and out of the tab order', () => {
    const { container } = renderShell();
    const marks = container.querySelector('.gb-shell__timing-marks');
    expect(marks).toHaveAttribute('aria-hidden', 'true');
    expect(marks).not.toHaveAttribute('tabindex');
    expect(marks?.querySelector('a, button, [tabindex]')).toBeNull();
  });

  it('keeps navigation and actions inside the rail', () => {
    const { container } = renderShell();
    const rail = container.querySelector('.gb-shell__rail');
    expect(rail).toContainElement(screen.getByRole('navigation', { name: 'Principal' }));
    expect(rail).toContainElement(screen.getByRole('button', { name: 'Sair' }));
    expect(rail).toContainElement(screen.getByRole('link', { name: 'Gabarita' }));
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
