export type BubbleFill = 'empty' | 'half' | 'filled';

export type BubbleProps = {
  fill: BubbleFill;
  size?: 'small' | 'regular';
  /** Read by screen readers instead of the shape; without it the bubble is decorative. */
  label?: string;
};

export function Bubble({ fill, size = 'regular', label }: BubbleProps) {
  const classes = [
    'gb-bubble',
    fill === 'empty' ? undefined : `gb-bubble--${fill}`,
    size === 'small' ? 'gb-bubble--small' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  if (label === undefined) return <span className={classes} aria-hidden="true" />;
  return (
    <span className={classes}>
      <span className="gb-visually-hidden">{label}</span>
    </span>
  );
}
