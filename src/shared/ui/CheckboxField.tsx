import { CircleAlert } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  id: string;
  label: string;
  /** Explanation shown under the label and read as the checkbox description. */
  hint?: string;
  error?: string;
};

export function CheckboxField({
  id,
  label,
  hint,
  error,
  className,
  'aria-describedby': describedBy,
  ...rest
}: CheckboxFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const hasHint = hint !== undefined && hint !== '';
  const hasError = error !== undefined && error !== '';
  const description =
    [describedBy, hasHint ? hintId : undefined, hasError ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  const classes = ['gb-checkbox__input', className].filter(Boolean).join(' ');

  return (
    <div className="gb-checkbox">
      <label className="gb-checkbox__label" htmlFor={id}>
        <input
          {...rest}
          id={id}
          type="checkbox"
          className={classes}
          aria-invalid={hasError || undefined}
          aria-describedby={description}
        />
        <span className="gb-checkbox__text">{label}</span>
      </label>
      {hasHint && (
        <p className="gb-checkbox__hint" id={hintId}>
          {hint}
        </p>
      )}
      {hasError && (
        <p className="gb-field__error" id={errorId}>
          <CircleAlert aria-hidden="true" strokeWidth={2} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
