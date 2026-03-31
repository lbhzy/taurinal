import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, CircleDot, Circle } from "lucide-react";

interface HexViewProps {
  data: string;
  enabled: boolean;
  onToggle: () => void;
  onClear: () => void;
}

function toHexLines(input: string): string[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);

  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const end = Math.min(offset + 16, bytes.length);
    const addr = offset.toString(16).padStart(8, "0");

    let hexLeft = "";
    let hexRight = "";
    let ascii = "";

    for (let i = 0; i < 16; i++) {
      const hex = offset + i < end ? bytes[offset + i].toString(16).padStart(2, "0") : "  ";
      if (i < 8) {
        hexLeft += (i > 0 ? " " : "") + hex;
      } else {
        hexRight += (i > 8 ? " " : "") + hex;
      }
      if (offset + i < end) {
        const b = bytes[offset + i];
        ascii += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".";
      }
    }

    lines.push(`${addr}  ${hexLeft}  ${hexRight}  |${ascii.padEnd(16)}|`);
  }

  return lines;
}

const LINE_HEIGHT = 20;

export function HexView({ data, enabled, onToggle, onClear }: HexViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const rafRef = useRef(0);
  const [scrollState, setScrollState] = useState({ top: 0, height: 400 });

  const lines = useMemo(() => toHexLines(data), [data]);
  const totalHeight = lines.length * LINE_HEIGHT;
  const byteCount = useMemo(() => new TextEncoder().encode(data).length, [data]);

  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = totalHeight;
    }
  }, [totalHeight]);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 40;
      setScrollState({ top: scrollTop, height: clientHeight });
    });
  }, []);

  // Compute visible window
  const startIdx = Math.max(0, Math.floor(scrollState.top / LINE_HEIGHT) - 5);
  const visibleCount = Math.ceil(scrollState.height / LINE_HEIGHT) + 10;
  const endIdx = Math.min(lines.length, startIdx + visibleCount);
  const visibleLines = lines.slice(startIdx, endIdx);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button
            className={
              enabled
                ? "flex items-center gap-1 h-5 px-1.5 text-xs text-green-400 rounded hover:bg-accent/50 transition-colors"
                : "flex items-center gap-1 h-5 px-1.5 text-xs text-muted-foreground rounded hover:bg-accent/50 transition-colors"
            }
            onClick={onToggle}
            title={enabled ? "Stop capturing" : "Start capturing"}
          >
            {enabled ? <CircleDot className="size-3" /> : <Circle className="size-3" />}
            {enabled ? "Recording" : "Paused"}
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            {byteCount} bytes
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground"
          onClick={onClear}
          title="Clear hex view"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-2 font-mono text-xs scrollbar-thin"
      >
        {lines.length === 0 ? (
          <span className="text-muted-foreground">
            {enabled
              ? "No data received yet. Terminal output will appear here in hex format."
              : "Hex capture is paused. Click the record button to start."}
          </span>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ position: "absolute", top: startIdx * LINE_HEIGHT, left: 0, right: 0 }}>
              {visibleLines.map((line, i) => (
                <div
                  key={startIdx + i}
                  className="whitespace-pre hover:bg-accent/30"
                  style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
                >
                  <span className="text-blue-400">{line.slice(0, 8)}</span>
                  <span className="text-muted-foreground">{line.slice(8, 10)}</span>
                  <span className="text-foreground">{line.slice(10, 33)}</span>
                  <span className="text-muted-foreground">{line.slice(33, 35)}</span>
                  <span className="text-foreground">{line.slice(35, 58)}</span>
                  <span className="text-muted-foreground">{line.slice(58, 60)}</span>
                  <span className="text-green-400">{line.slice(60)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
