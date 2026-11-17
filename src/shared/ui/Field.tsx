import { CircleAlert } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string;
  label: string;
  error?: string;
};

export function Field({
  id,
  label,
  error,
  className,
  'aria-describedby': describedBy,
  ...rest
}: FieldProps) {
  const errorId = `${id}-error`;
  const hasError = error !== undefined && error !== '';
  const description =
    [describedBy, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  const classes = ['gb-field__input', className].filter(Boolean).join(' ');

  return (
    <div className="gb-field">
      <label className="gb-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...rest}
        id={id}
        className={classes}
        aria-invalid={hasError || undefined}
        aria-describedby={description}
      />
      {hasError && (
        <p className="gb-field__error" id={errorId}>
          <CircleAlert aria-hidden="true" strokeWidth={2} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
