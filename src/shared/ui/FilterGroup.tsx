import Link from 'next/link';
import { useId } from 'react';

export type FilterOption = { label: string; href: string; current: boolean };

export type FilterGroupProps = {
  label: string;
  options: ReadonlyArray<FilterOption>;
};

export function FilterGroup({ label, options }: FilterGroupProps) {
  const labelId = useId();
  return (
    <div className="gb-filter-group" role="group" aria-labelledby={labelId}>
      <span className="gb-filter-group__label" id={labelId}>
        {label}
      </span>
      <ul className="gb-segmented">
        {options.map((option) => (
          <li key={option.href}>
            <Link
              className="gb-segmented__option"
              href={option.href}
              aria-current={option.current ? 'true' : undefined}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
