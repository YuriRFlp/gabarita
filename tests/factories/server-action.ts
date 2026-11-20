import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';

type Encoded = { name: string; method: 'POST'; encType: 'multipart/form-data'; data: null };

const encode = (): Encoded => ({
  name: '$ACTION_ID_test',
  method: 'POST',
  encType: 'multipart/form-data',
  data: null,
});

/**
 * Gives a test function the shape Next gives a Server Action reference in server rendering:
 * `$$FORM_ACTION`, kept by `bind` (useActionState binds the state). With it, React renders a form
 * that posts without JavaScript; a plain or wrapped function renders `javascript:throw ...` instead.
 */
export function asServerAction<T extends (...args: never[]) => unknown>(action: T): T {
  const bind = Function.prototype.bind;
  return Object.assign(action, {
    $$FORM_ACTION: encode,
    bind: (thisArg: unknown, ...args: unknown[]) =>
      Object.assign(bind.call(action, thisArg, ...args), { $$FORM_ACTION: encode }),
  });
}

/** The `action` attribute of every form in the server HTML (`''` when the form has none). */
export function serverFormActions(element: ReactNode): string[] {
  const html = renderToString(element);
  const template = document.createElement('template');
  template.innerHTML = html;
  return Array.from(template.content.querySelectorAll('form')).map(
    (form) => form.getAttribute('action') ?? '',
  );
}
