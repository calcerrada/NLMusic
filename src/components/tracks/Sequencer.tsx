'use client';

import { useSessionStore } from '@/store/sessionStore';
import { StepButton } from './StepButton';

interface SequencerProps {
  trackId: string;
  steps: (0 | 1)[];
  tag: string;
  activeStep: number;
}

export function Sequencer({ trackId, steps, tag, activeStep }: SequencerProps) {
  const toggleStep = useSessionStore((s) => s.toggleStep);

  return (
    <div className="flex items-center">
      {steps.map((on, index) => (
        <div
          key={`${trackId}-${index}`}
          className={index > 0 && index % 4 === 0 ? 'ml-[6px] flex-1' : 'flex-1'}
        >
          <StepButton
            on={on === 1}
            active={activeStep === index}
            tag={tag}
            onClick={() => toggleStep(trackId, index)}
          />
        </div>
      ))}
    </div>
  );
}
