import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Shell } from './Shell';

const navigation = [
  { label: 'Início', href: '/', icon: <svg aria-hidden="true" /> },
  { label: 'Questões', href: '/questions', icon: <svg aria-hidden="true" /> },
];

const secondaryNavigation = [
  {
    label: 'Configurações',
    href: '/settings',
    icon: <svg data-testid="gear" aria-hidden="true" />,
  },
];

function renderShell(currentPath = '/', withSecondary = false) {
  return render(
    <Shell
      logo={<span>Gabarita</span>}
      navigation={navigation}
      secondaryNavigation={withSecondary ? secondaryNavigation : undefined}
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

  it('shows an icon on every item, hidden from screen readers, with no number', () => {
    const { container } = renderShell('/');
    for (const link of screen.getAllByRole('link', { name: /Início|Questões/ })) {
      expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(link).not.toHaveTextContent(/\d/);
    }
    expect(screen.getByRole('link', { name: 'Questões' })).toHaveAccessibleName('Questões');
    expect(container.querySelector('.gb-shell__rail-number')).toBeNull();
  });

  it('keeps the icon on the current item, with no bubble', () => {
    renderShell('/questions');
    const current = screen.getByRole('link', { name: 'Questões' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(current.querySelector('.gb-bubble')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Início' }).querySelector('svg[aria-hidden="true"]'),
    ).not.toBeNull();
  });

  it('has no theme toggle in the shell, only what the caller passes as actions', () => {
    renderShell();
    expect(screen.queryByRole('group', { name: 'Tema' })).toBeNull();
    expect(screen.queryByText('Aparência')).toBeNull();
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

  describe('secondary navigation', () => {
    it('does not render the secondary navigation when none is given', () => {
      renderShell();
      expect(screen.queryByRole('navigation', { name: 'Preferências' })).toBeNull();
    });

    it('renders the link inside the menu, before the actions, with its icon', () => {
      const { container } = renderShell('/', true);
      const link = screen.getByRole('link', { name: 'Configurações' });
      expect(link).toHaveAttribute('href', '/settings');
      expect(link).not.toHaveAttribute('aria-current');
      expect(link.querySelector('[data-testid="gear"]')).toBeInTheDocument();
      const secondary = container.querySelector('.gb-shell__secondary');
      const actions = container.querySelector('.gb-shell__actions');
      expect(secondary).toContainElement(link);
      expect(secondary?.nextElementSibling).toBe(actions);
    });

    it('marks the link as current and keeps its icon, with no bubble', () => {
      renderShell('/settings', true);
      const link = screen.getByRole('link', { name: 'Configurações' });
      expect(link).toHaveAttribute('aria-current', 'page');
      expect(link.querySelector('.gb-bubble')).toBeNull();
      expect(link.querySelector('[data-testid="gear"]')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
    });

    it('closes the open menu when the link is activated', async () => {
      renderShell('/', true);
      const button = screen.getByRole('button', { name: 'Menu' });
      await userEvent.click(button);
      await userEvent.click(screen.getByRole('link', { name: 'Configurações' }));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
