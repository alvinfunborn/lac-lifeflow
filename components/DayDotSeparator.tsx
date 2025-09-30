import React, { useEffect, useRef, useState } from 'react';
// 样式请统一写入插件根目录的 styles.css

interface DayDotSeparatorProps {
  count: number;
}

const DOT_SIZE_PX = 3; // 与样式保持一致
const DOT_GAP_PX = 3; // 左右合计（margin-left + margin-right）= 3px
const MAX_RENDER_DOTS = 50; // 上限，避免极大数量导致渲染卡顿

export default function DayDotSeparator({ count }: DayDotSeparatorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [showLine, setShowLine] = useState(false);

  useEffect(() => {
    if (!count || count <= 0) return;
    const el = ref.current;
    if (!el) return;

    const recompute = () => {
      const width = el?.getBoundingClientRect().width || 0;
      const perDot = DOT_SIZE_PX + DOT_GAP_PX;
      const need = count * perDot;
      setShowLine(need > width);
    };

    recompute();

    let ro: ResizeObserver | null = null;
    if (typeof (window as any).ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => recompute());
      ro.observe(el);
    } else {
      window.addEventListener('resize', recompute);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', recompute);
    };
  }, [count]);

  if (!count || count <= 0) return null;

  const dots = Array.from({ length: Math.min(count, MAX_RENDER_DOTS) });
  return (
    <div ref={ref} className={`day-dot-separator${showLine ? ' line' : ''}`}>
      {!showLine && dots.map((_, i) => (
        <div key={i} className='dot' />
      ))}
    </div>
  );
} 