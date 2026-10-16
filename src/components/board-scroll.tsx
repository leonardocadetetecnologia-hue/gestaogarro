"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function BoardScroll({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: ReactNode;
}) {
  const board = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const sizer = useRef<HTMLDivElement>(null);
  const lock = useRef(false);

  useLayoutEffect(() => {
    const boardEl = board.current;
    const barEl = bar.current;
    const sizerEl = sizer.current;
    if (!boardEl || !barEl || !sizerEl) return;

    const fit = () => {
      sizerEl.style.width = `${boardEl.scrollWidth}px`;
      barEl.hidden = boardEl.scrollWidth - boardEl.clientWidth <= 1;
      if (!lock.current) barEl.scrollLeft = boardEl.scrollLeft;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(boardEl);
    for (const child of boardEl.children) observer.observe(child);
    return () => observer.disconnect();
  }, [children]);

  function follow(source: HTMLDivElement, target: HTMLDivElement) {
    if (lock.current || source.scrollLeft === target.scrollLeft) return;
    lock.current = true;
    target.scrollLeft = source.scrollLeft;
    lock.current = false;
  }

  return (
    <div className="board-scroll">
      <div
        className="board-scroll-bar"
        ref={bar}
        hidden
        aria-label={label}
        onScroll={event => {
          if (board.current) follow(event.currentTarget, board.current);
        }}
      >
        <div className="board-scroll-sizer" ref={sizer} />
      </div>
      <div
        className={className}
        ref={board}
        onScroll={event => {
          if (bar.current) follow(event.currentTarget, bar.current);
        }}
      >
        {children}
      </div>
    </div>
  );
}
