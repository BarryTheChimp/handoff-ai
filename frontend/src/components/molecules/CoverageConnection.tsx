import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface Point {
  x: number;
  y: number;
}

interface CoverageConnectionProps {
  sourceRef: React.RefObject<HTMLElement>;
  targetRef: React.RefObject<HTMLElement>;
  isActive?: boolean;
  relevance?: number; // 0-1
  color?: string;
}

export function CoverageConnection({
  sourceRef,
  targetRef,
  isActive = false,
  relevance = 1,
  color = '#FF6B35',
}: CoverageConnectionProps) {
  const [path, setPath] = useState<string>('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const calculatePath = () => {
      if (!sourceRef.current || !targetRef.current || !svgRef.current) return;

      const sourceRect = sourceRef.current.getBoundingClientRect();
      const targetRect = targetRef.current.getBoundingClientRect();
      const svgRect = svgRef.current.getBoundingClientRect();

      // Calculate connection points relative to SVG container
      const source: Point = {
        x: sourceRect.right - svgRect.left,
        y: sourceRect.top + sourceRect.height / 2 - svgRect.top,
      };

      const target: Point = {
        x: targetRect.left - svgRect.left,
        y: targetRect.top + targetRect.height / 2 - svgRect.top,
      };

      // Create a curved path
      const midX = (source.x + target.x) / 2;
      const pathData = `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
      setPath(pathData);
    };

    calculatePath();

    // Recalculate on scroll or resize
    const handleUpdate = () => requestAnimationFrame(calculatePath);
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [sourceRef, targetRef]);

  if (!path) return null;

  const opacity = isActive ? 0.8 : 0.2 + relevance * 0.3;
  const strokeWidth = isActive ? 2.5 : 1.5;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: isActive ? 10 : 1 }}
    >
      <defs>
        <linearGradient id={`gradient-${isActive ? 'active' : 'inactive'}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <stop offset="100%" stopColor={color} stopOpacity={opacity * 0.5} />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={`url(#gradient-${isActive ? 'active' : 'inactive'})`}
        strokeWidth={strokeWidth}
        className={clsx(
          'transition-all duration-300',
          isActive && 'animate-pulse'
        )}
      />
      {/* Arrow head */}
      {isActive && (
        <circle
          cx={path.split(' ').slice(-2)[0]}
          cy={path.split(' ').slice(-1)[0]}
          r={4}
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

// Container component for managing connections
interface ConnectionContainerProps {
  children: React.ReactNode;
  connections: Array<{
    sourceId: string;
    targetId: string;
    relevance: number;
    isActive: boolean;
  }>;
  className?: string;
}

export function ConnectionContainer({ children, connections, className }: ConnectionContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [refs, setRefs] = useState<Map<string, React.RefObject<HTMLElement>>>(new Map());

  // Child components should register their refs using data-connection-id attribute
  useEffect(() => {
    if (!containerRef.current) return;

    const newRefs = new Map<string, React.RefObject<HTMLElement>>();
    const elements = containerRef.current.querySelectorAll('[data-connection-id]');

    elements.forEach((el) => {
      const id = el.getAttribute('data-connection-id');
      if (id) {
        newRefs.set(id, { current: el as HTMLElement });
      }
    });

    setRefs(newRefs);
  }, [children]);

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {children}
      {connections.map((conn, index) => {
        const sourceRef = refs.get(conn.sourceId);
        const targetRef = refs.get(conn.targetId);

        if (!sourceRef || !targetRef) return null;

        return (
          <CoverageConnection
            key={`${conn.sourceId}-${conn.targetId}-${index}`}
            sourceRef={sourceRef}
            targetRef={targetRef}
            relevance={conn.relevance}
            isActive={conn.isActive}
          />
        );
      })}
    </div>
  );
}
