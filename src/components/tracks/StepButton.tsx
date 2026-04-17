'use client';

const stepColors: Record<string, { bg: string; glow: string }> = {
  kick: { bg: '#00ffc8', glow: 'rgba(0,255,200,0.3)' },
  snare: { bg: '#ffaa00', glow: 'rgba(255,170,0,0.3)' },
  hihat: { bg: '#b482ff', glow: 'rgba(180,130,255,0.3)' },
  default: { bg: '#00ffc8', glow: 'rgba(0,255,200,0.3)' },
};

interface StepButtonProps {
  on: boolean;
  active: boolean;
  tag: string;
  onClick: () => void;
}

export function StepButton({ on, active, tag, onClick }: StepButtonProps) {
  const color = stepColors[tag] ?? stepColors.default;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-[26px] flex-1 rounded-[3px] border transition-all duration-[80ms]',
        'hover:bg-[rgba(255,255,255,0.1)]',
        active ? 'outline outline-1 outline-offset-1 outline-[rgba(255,255,255,0.3)]' : '',
      ].join(' ')}
      style={{
        background: on ? color.bg : 'rgba(255,255,255,0.06)',
        borderColor: on ? 'transparent' : 'rgba(255,255,255,0.04)',
        boxShadow: on ? `0 0 6px ${color.glow}` : 'none',
        transform: on && active ? 'scaleY(1.08)' : 'scaleY(1)',
      }}
      aria-label="Toggle step"
    />
  );
}
