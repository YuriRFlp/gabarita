'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Bubble } from './Bubble';

/** `number` is the module number from docs/01 ("00" for home), shown like a row of the answer sheet. */
export type NavigationItem = { number: string; label: string; href: string; icon: ReactNode };

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
      <header className="gb-shell__rail" onKeyDown={handleKeyDown}>
        <div className="gb-timing-marks gb-shell__timing-marks" aria-hidden="true" />
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
              {navigation.map((item) => {
                const active = isActive(item.href, currentPath);
                return (
                  <li key={item.href}>
                    <Link
                      className="gb-shell__link"
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={close}
                    >
                      <span className="gb-shell__rail-number" aria-hidden="true">
                        {active ? <Bubble fill="filled" size="small" /> : item.number}
                      </span>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
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
