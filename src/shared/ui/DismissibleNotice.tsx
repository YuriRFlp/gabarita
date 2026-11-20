'use client';

import { X } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { NoticeFrame } from './NoticeFrame';

export type DismissibleNoticeProps = {
  children: ReactNode;
  /**
   * Identity of the result being shown (e.g. the action state). A new value shows the notice again
   * after it was closed, so a later save is not silent.
   */
  resetKey?: unknown;
  /** Called once when the reader closes the notice, by the button or Esc. */
  onDismiss?: () => void | Promise<void>;
  kind?: 'error' | 'success' | 'info';
  id?: string;
  tabIndex?: number;
  ref?: Ref<HTMLDivElement>;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Notice with a close button, used by Notice (every kind is dismissible by default). Kept apart so
 * Notice itself stays a Server Component.
 */
export function DismissibleNotice({
  children,
  resetKey,
  onDismiss,
  kind = 'success',
  id,
  tabIndex,
  ref,
}: DismissibleNoticeProps) {
  const [closedFor, setClosedFor] = useState<{ key: unknown } | null>(null);
  const root = useRef<HTMLDivElement | null>(null);

  if (closedFor !== null && Object.is(closedFor.key, resetKey)) return null;

  function setRoot(element: HTMLDivElement | null) {
    root.current = element;
    if (typeof ref === 'function') ref(element);
    else if (ref) ref.current = element;
  }

  function close() {
    const notice = root.current;
    const container = notice?.closest<HTMLElement>('form, section, main') ?? null;
    // Move focus before the notice leaves the DOM so it is never dropped on the page body.
    const next = container
      ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
          (element) =>
            !notice?.contains(element) &&
            Boolean(notice!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
        )
      : undefined;
    if (next) next.focus();
    else if (container) {
      container.tabIndex = -1;
      container.focus();
    }
    setClosedFor({ key: resetKey });
    void onDismiss?.();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  return (
    <NoticeFrame
      kind={kind}
      id={id}
      tabIndex={tabIndex}
      ref={setRoot}
      action={
        <button
          type="button"
          className="gb-notice__close"
          aria-label="Fechar aviso"
          onClick={close}
          onKeyDown={onKeyDown}
        >
          <X aria-hidden="true" strokeWidth={2} />
        </button>
      }
    >
      {children}
    </NoticeFrame>
  );
}
