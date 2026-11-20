import { CircleAlert } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string;
  label: string;
  error?: string;
  /** Unit shown after the input (e.g. "%"); decorative, so the label should already name the unit. */
  suffix?: string;
  /** Keeps the label for assistive technology only, when the surroundings already name the field. */
  hideLabel?: boolean;
};

export function Field({
  id,
  label,
  error,
  suffix,
  hideLabel,
  className,
  'aria-describedby': describedBy,
  ...rest
}: FieldProps) {
  const errorId = `${id}-error`;
  const hasError = error !== undefined && error !== '';
  const description =
    [describedBy, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  const classes = ['gb-field__input', className].filter(Boolean).join(' ');

  const input = (
    <input
      {...rest}
      id={id}
      className={classes}
      aria-invalid={hasError || undefined}
      aria-describedby={description}
    />
  );

  return (
    <div className="gb-field">
      <label
        className={hideLabel ? 'gb-field__label gb-field__label--hidden' : 'gb-field__label'}
        htmlFor={id}
      >
        {label}
      </label>
      {suffix === undefined ? (
        input
      ) : (
        <div className="gb-field__control">
          {input}
          <span className="gb-field__suffix" aria-hidden="true">
            {suffix}
          </span>
        </div>
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
