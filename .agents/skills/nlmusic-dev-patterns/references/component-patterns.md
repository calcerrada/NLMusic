# Component Patterns

Detailed reference for building and composing UI components in this codebase.

---

## Primitive Components

Primitives are **stateless, presentational** components. They receive props, render UI, and nothing else. They never import from the store or call hooks.

### Button

```typescript
// src/components/primitives/Button.tsx
import type React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'font-bold rounded transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? '⏳' : children}
    </button>
  );
}
```

**Usage:**
```typescript
<Button variant="success" onClick={handlePlay}>▶ Play</Button>
<Button variant="danger" onClick={handleStop}>⏹ Stop</Button>
<Button loading={isGenerating} type="submit">Generar</Button>
```

---

### IconButton

For compact, icon-only buttons (Mute, Solo).

```typescript
// src/components/primitives/IconButton.tsx
export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  activeClassName?: string;
  inactiveClassName?: string;
}

export function IconButton({
  active = false,
  activeClassName = 'bg-red-900 text-red-200',
  inactiveClassName = 'bg-gray-700 text-gray-300 hover:bg-gray-600',
  children,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={[
        'px-2 py-1 text-xs font-bold rounded transition-all',
        active ? activeClassName : inactiveClassName,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Usage:**
```typescript
<IconButton
  active={track.muted}
  activeClassName="bg-red-900 text-red-200"
  onClick={() => toggleMute()}
  title="Mute"
>
  M
</IconButton>
<IconButton
  active={track.solo}
  activeClassName="bg-green-900 text-green-200"
  onClick={() => toggleSolo()}
  title="Solo"
>
  S
</IconButton>
```

---

### TextInput

```typescript
// src/components/primitives/TextInput.tsx
export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export function TextInput({ className = '', ...props }: TextInputProps) {
  return (
    <input
      className={[
        'flex-1 px-3 py-2',
        'bg-dark-50 border border-gray-600 rounded',
        'text-white placeholder:text-gray-500',
        'disabled:opacity-50',
        'focus:outline-none focus:border-gray-400',
        className,
      ].join(' ')}
      {...props}
    />
  );
}
```

---

### RangeSlider

```typescript
// src/components/primitives/RangeSlider.tsx
export interface RangeSliderProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  displayValue?: string;
}

export function RangeSlider({
  label,
  displayValue,
  className = '',
  ...props
}: RangeSliderProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <label className="text-xs font-bold whitespace-nowrap">{label}</label>
      )}
      <input
        type="range"
        className={['flex-1 accent-blue-500', className].join(' ')}
        {...props}
      />
      {displayValue && (
        <span className="text-xs text-gray-400 font-mono w-10 text-right">
          {displayValue}
        </span>
      )}
    </div>
  );
}
```

**Usage:**
```typescript
<RangeSlider
  label="BPM"
  min={60} max={220}
  value={bpm}
  onChange={(e) => updateBpm(Number(e.target.value))}
  displayValue={String(bpm)}
/>
<RangeSlider
  min={0} max={1} step={0.05}
  value={track.volume}
  onChange={(e) => setVolume(parseFloat(e.target.value))}
  displayValue={`${Math.round(track.volume * 100)}%`}
/>
```

---

### Card

```typescript
// src/components/primitives/Card.tsx
interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Card({ children, title, className = '' }: CardProps) {
  return (
    <div
      className={[
        'bg-dark-50 rounded border border-gray-700 p-4',
        className,
      ].join(' ')}
    >
      {title && (
        <h2 className="text-xs font-bold uppercase text-gray-400 mb-3">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
```

---

## Composition Pattern

Features compose primitives. Example of `TrackLane` refactored:

```typescript
// src/components/TrackLane.tsx (refactored)
import { Card } from './primitives/Card';
import { IconButton } from './primitives/IconButton';
import { RangeSlider } from './primitives/RangeSlider';
import { useTrackActions } from '@/lib/hooks/useTrackActions';
import type { Track } from '@/lib/llm/types';

interface TrackLaneProps {
  track: Track;
}

export function TrackLane({ track }: TrackLaneProps) {
  const { toggleMute, toggleSolo, setVolume, toggleStep } =
    useTrackActions(track.id);

  return (
    <div className="flex items-center gap-2 p-2 bg-dark rounded border border-gray-700">
      {/* Track info */}
      <div className="w-24 flex-shrink-0">
        <div className="text-xs font-bold">{track.name}</div>
        <div className="text-xs text-gray-500">{track.sample}</div>
      </div>

      {/* 16-step grid */}
      <div className="flex gap-1 flex-1">
        {track.steps.map((step, idx) => (
          <button
            key={idx}
            onClick={() => toggleStep(idx, step === 1 ? 0 : 1)}
            className={`w-6 h-6 text-xs font-bold transition rounded ${
              step === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-600 hover:bg-gray-700'
            }`}
            title={`Paso ${idx + 1}`}
          >
            {step === 1 ? '■' : '□'}
          </button>
        ))}
      </div>

      {/* Volume */}
      <RangeSlider
        min={0} max={1} step={0.05}
        value={track.volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        displayValue={`${Math.round(track.volume * 100)}%`}
        className="w-16"
      />

      {/* Mute / Solo */}
      <div className="flex gap-1">
        <IconButton
          active={track.muted}
          activeClassName="bg-red-900 text-red-200"
          onClick={toggleMute}
          title="Mute"
        >
          M
        </IconButton>
        <IconButton
          active={track.solo}
          activeClassName="bg-green-900 text-green-200"
          onClick={toggleSolo}
          title="Solo"
        >
          S
        </IconButton>
      </div>
    </div>
  );
}
```

---

## Anti-patterns to Avoid

### ❌ Long inline Tailwind strings with conditional logic

```typescript
// ❌ Hard to read, no reuse
<button className={`px-4 py-2 ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white font-bold disabled:bg-gray-600 rounded`}>
```

```typescript
// ✅ Variants map + primitive
<Button variant={isPlaying ? 'danger' : 'success'} onClick={toggle}>
  {isPlaying ? 'Stop' : 'Play'}
</Button>
```

---

### ❌ Mixing state logic with rendering

```typescript
// ❌ Fetch logic + JSX in same function
export function PromptBox() {
  const handleSubmit = async () => {
    const res = await fetch('/api/generate-pattern', { ... });
    const data = await res.json();
    loadPattern(data.trackJson);
    addTurn({ ... });
  };
  return <form onSubmit={handleSubmit}>...</form>;
}
```

```typescript
// ✅ Logic in hook, component just renders
export function PromptBox() {
  const { generate } = useGeneratePattern();
  const handleSubmit = async (e) => {
    e.preventDefault();
    await generate(input);
  };
  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

### ❌ Accepting store changes without selector

```typescript
// ❌ Re-renders on any store change
const { bpm, error, isGenerating, tracks, strudelCode, addTurn } = useSessionStore();
```

```typescript
// ✅ Select only what you need
const { isGenerating } = useSessionStore((s) => ({ isGenerating: s.isGenerating }));
// or use a selector hook
const { isGenerating } = usePlaybackState();
```
