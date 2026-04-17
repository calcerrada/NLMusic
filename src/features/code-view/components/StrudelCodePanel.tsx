'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useSessionStore } from '@store/sessionStore';

interface Token {
  value: string;
  className: string;
}

function highlightLine(line: string): Token[] {
  const pattern = /(\/\/.*$|"[^"]*"|'[^']*'|\b(stack|s|gain|cpm|slow|fast|silence)\b|[(){}.,:$])/g;
  const tokens: Token[] = [];
  let cursor = 0;
  let match = pattern.exec(line);

  while (match) {
    if (match.index > cursor) {
      tokens.push({ value: line.slice(cursor, match.index), className: '' });
    }

    const value = match[0];
    let className = '';

    if (value.startsWith('//')) {
      className = 'text-[rgba(98,114,164,0.6)]';
    } else if (value.startsWith('"') || value.startsWith("'")) {
      className = 'text-[#f1fa8c]';
    } else if (/^(stack|s|gain|cpm|slow|fast|silence)$/.test(value)) {
      className = 'text-[#50fa7b]';
    } else {
      className = 'text-[var(--text-dim)]';
    }

    tokens.push({ value, className });
    cursor = pattern.lastIndex;
    match = pattern.exec(line);
  }

  if (cursor < line.length) {
    tokens.push({ value: line.slice(cursor), className: '' });
  }

  return tokens;
}

export function StrudelCodePanel() {
  const currentCode = useSessionStore((s) => s.currentCode);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const codeLines = useMemo(() => {
    const intro = '// NLMusic — patrón generado';
    return [intro, '$: ' + currentCode];
  }, [currentCode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    let rafId = 0;
    let frame = 0;

    const draw = () => {
      frame += 1;
      const width = canvas.clientWidth;
      const height = canvas.height;
      if (canvas.width !== width) {
        canvas.width = width;
      }

      context.clearRect(0, 0, width, height);
      context.strokeStyle = 'rgba(0,255,200,0.5)';
      context.lineWidth = 1.5;
      context.beginPath();

      for (let x = 0; x < width; x += 1) {
        const angle = (x + frame * 2) * 0.03;
        const y = height / 2 + Math.sin(angle) * 10;
        if (x === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-3">
        {codeLines.map((line, index) => {
          const tokens = highlightLine(line);
          const lineNumber = index + 1;

          return (
            <div key={lineNumber} className="flex gap-3 leading-6 text-[12px] font-medium">
              <span className="w-5 select-none text-right text-[var(--text-muted)]">{lineNumber}</span>
              <span className="flex-1 whitespace-pre-wrap text-[var(--text)]">
                {tokens.map((token, tokenIndex) => (
                  <span key={`${lineNumber}-${tokenIndex}`} className={token.className}>
                    {token.value}
                  </span>
                ))}
                {index === codeLines.length - 1 ? <span className="code-cursor ml-[2px] inline-block h-[14px] w-[2px] bg-[var(--cyan)] align-middle" /> : null}
              </span>
            </div>
          );
        })}
      </div>

      <div className="scope-wrap rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-2">
        <canvas ref={canvasRef} className="scope-canvas w-full" height={50} />
      </div>
    </div>
  );
}
