'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

/** Rail item: a Lucide icon (decorative) and the label; the current one is marked by its background. */
export type NavigationItem = { label: string; href: string; icon: ReactNode };

/** Link below the main list (e.g. Configurações); same shape and treatment. */
export type SecondaryNavigationItem = NavigationItem;

export type ShellProps = {
  logo: ReactNode;
  navigation: ReadonlyArray<NavigationItem>;
  secondaryNavigation?: ReadonlyArray<SecondaryNavigationItem>;
  currentPath: string;
  actions: ReactNode;
  children: ReactNode;
};

function isActive(href: string, currentPath: string): boolean {
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function Shell({
  logo,
  navigation,
  secondaryNavigation = [],
  currentPath,
  actions,
  children,
}: ShellProps) {
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
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {secondaryNavigation.length > 0 && (
            <nav className="gb-shell__secondary" aria-label="Preferências">
              <ul className="gb-shell__list">
                {secondaryNavigation.map((item) => {
                  const active = isActive(item.href, currentPath);
                  return (
                    <li key={item.href}>
                      <Link
                        className="gb-shell__secondary-link"
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={close}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          <div className="gb-shell__actions">{actions}</div>
        </div>
      </header>
      <main id="content" className="gb-shell__content">
        {children}
      </main>
    </div>
  );
}
