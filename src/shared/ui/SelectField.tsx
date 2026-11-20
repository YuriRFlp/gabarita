import { CircleAlert } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  id: string;
  label: string;
  error?: string;
};

export function SelectField({
  id,
  label,
  error,
  className,
  children,
  'aria-describedby': describedBy,
  ...rest
}: SelectFieldProps) {
  const errorId = `${id}-error`;
  const hasError = error !== undefined && error !== '';
  const description =
    [describedBy, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  const classes = ['gb-field__input', 'gb-field__select', className].filter(Boolean).join(' ');

  return (
    <div className="gb-field">
      <label className="gb-field__label" htmlFor={id}>
        {label}
      </label>
      <select
        {...rest}
        id={id}
        className={classes}
        aria-invalid={hasError || undefined}
        aria-describedby={description}
      >
        {children}
      </select>
      {hasError && (
        <p className="gb-field__error" id={errorId}>
          <CircleAlert aria-hidden="true" strokeWidth={2} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
