"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className = "",
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const totalHeight = items.length * itemHeight;
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const visible = Math.ceil(height / itemHeight) + 4;
  const end = Math.min(items.length, start + visible);
  const slice = items.slice(start, end);

  return (
    <div
      ref={ref}
      className={`overflow-y-auto ${className}`}
      style={{ height }}
      role="list"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {slice.map((item, i) => {
          const index = start + i;
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                top: index * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
