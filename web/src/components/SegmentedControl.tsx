// A two-or-more-way switch in the manner of Mantine's SegmentedControl: a
// soft track, equal-width options, and one raised indicator that slides to
// the chosen option. The indicator is a single element moved by transform, so
// the change reads as one motion rather than two buttons swapping colours.
import type { CSSProperties, ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** the accessible name when the label is only an icon */
  ariaLabel?: string;
  title?: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  size?: 'xs' | 'sm' | 'md';
  /** 'filled' paints the indicator in the accent (or `tone`) instead of the raised surface */
  variant?: 'default' | 'filled';
  /** the indicator colour of a filled control */
  tone?: 'accent' | 'alert';
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options, value, onChange, ariaLabel, size = 'sm', variant = 'default',
  tone = 'accent', fullWidth = false, className = '',
}: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const cls = [
    'segc', `segc--${size}`,
    variant === 'filled' ? `segc--filled segc--${tone}` : '',
    fullWidth ? 'segc--full' : '', className,
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} role="radiogroup" aria-label={ariaLabel}
      style={{ '--segc-n': options.length, '--segc-i': index } as CSSProperties}>
      <span className="segc__indicator" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio"
          aria-checked={o.value === value} aria-label={o.ariaLabel} title={o.title}
          className={`segc__option${o.value === value ? ' is-active' : ''}`}
          onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
