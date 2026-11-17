'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type NavigationItem = { label: string; href: string; icon: ReactNode };

export type ShellProps = {
  logo: ReactNode;
  navigation: ReadonlyArray<NavigationItem>;
  currentPath: string;
  actions: ReactNode;
  children: ReactNode;
};

function isActive(href: string, currentPath: string): boolean {
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function Shell({ logo, navigation, currentPath, actions, children }: ShellProps) {
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  // Storing the path where the menu opened closes it on navigation without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const isOpen = openAt === currentPath;

  function close() {
    setOpenAt(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && isOpen) {
      close();
      menuButton.current?.focus();
    }
  }

  return (
    <div className="gb-shell">
      <a className="gb-shell__skip" href="#content">
        Pular para o conteúdo
      </a>
      <header className="gb-shell__header" onKeyDown={handleKeyDown}>
        <Link className="gb-shell__logo" href="/">
          {logo}
        </Link>
        <button
          ref={menuButton}
          type="button"
          className="gb-button gb-button--secondary gb-shell__menu-button"
          aria-expanded={isOpen}
          aria-controls={menuId}
          onClick={() => setOpenAt(isOpen ? null : currentPath)}
        >
          {isOpen ? (
            <X aria-hidden="true" strokeWidth={2} />
          ) : (
            <Menu aria-hidden="true" strokeWidth={2} />
          )}
          Menu
        </button>
        <div
          id={menuId}
          className={isOpen ? 'gb-shell__menu gb-shell__menu--open' : 'gb-shell__menu'}
        >
          <nav aria-label="Principal">
            <ul className="gb-shell__list">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="gb-shell__link"
                    href={item.href}
                    aria-current={isActive(item.href, currentPath) ? 'page' : undefined}
                    onClick={close}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="gb-shell__actions">{actions}</div>
        </div>
      </header>
      <main id="content" className="gb-shell__content">
        {children}
      </main>
    </div>
  );
}
