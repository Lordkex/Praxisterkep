// A two-or-more-way switch in the manner of Mantine's SegmentedControl: a
// soft track, equal-width options, and one raised indicator that slides to
// the chosen option. The indicator is a single element moved by transform, so
// the change reads as one motion rather than two buttons swapping colours.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

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
  /** options as wide as their labels, not equal: the indicator is then
   *  measured onto the chosen option instead of moved by a fraction */
  fit?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options, value, onChange, ariaLabel, size = 'sm', variant = 'default',
  tone = 'accent', fullWidth = false, fit = false, className = '',
}: Props<T>) {
  const found = options.findIndex((o) => o.value === value);
  const index = Math.max(0, found);
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    if (!fit) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const b = el.querySelectorAll<HTMLElement>('.segc__option')[index];
      if (b) setBox((cur) => (cur && cur.x === b.offsetLeft && cur.w === b.offsetWidth
        ? cur : { x: b.offsetLeft, w: b.offsetWidth }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, index, options.length]);
  const cls = [
    'segc', `segc--${size}`,
    // one of several controls that share a value (the járás page's grouped
    // measures): when the value is in another group, nothing here is lit
    found < 0 ? 'segc--none' : '',
    variant === 'filled' ? `segc--filled segc--${tone}` : '',
    fullWidth ? 'segc--full' : '', fit ? 'segc--fit' : '', className,
  ].filter(Boolean).join(' ');
  return (
    <div ref={ref} className={cls} role="radiogroup" aria-label={ariaLabel}
      style={{ '--segc-n': options.length, '--segc-i': index } as CSSProperties}>
      <span className="segc__indicator" aria-hidden="true"
        style={fit && box ? { left: box.x, width: box.w, transform: 'none' } : undefined} />
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
