import { useState, useRef, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelTab {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

interface BottomPanelProps {
  tabs: PanelTab[];
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function BottomPanel({
  tabs,
  defaultHeight = 200,
  minHeight = 100,
  maxHeight = 500,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const [height, setHeight] = useState(defaultHeight);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = height;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return;
        const delta = startYRef.current - ev.clientY;
        const newHeight = Math.min(
          maxHeight,
          Math.max(minHeight, startHeightRef.current + delta)
        );
        setHeight(newHeight);
      };

      const handleMouseUp = () => {
        draggingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [height, minHeight, maxHeight]
  );

  return (
    <div
      className="flex flex-col shrink-0 border-t border-border bg-card"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        className="h-1 cursor-ns-resize hover:bg-blue-500/50 active:bg-blue-500/50 transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Tab bar */}
      <div className="flex items-center border-b border-border shrink-0 h-8 select-none">
        <div className="flex items-center flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "flex items-center gap-1.5 px-3 h-full text-xs transition-colors border-b-2",
                activeTab === tab.id
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 min-h-0 overflow-hidden">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "h-full",
                activeTab === tab.id ? "block" : "hidden"
              )}
            >
              {tab.content}
            </div>
          ))}
      </div>
    </div>
  );
}
