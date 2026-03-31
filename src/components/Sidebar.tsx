import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  TerminalSquare,
  Globe,
  Usb,
  Plus,
  Settings,
  Trash2,
  Play,
} from "lucide-react";
import type { SavedSession } from "@/lib/saved-sessions";
import type { ConnectionConfig } from "./Terminal";

type SidebarPanel = "sessions" | null;

interface SidebarProps {
  sessions: SavedSession[];
  onOpenSession: (config: ConnectionConfig) => void;
  onManageSessions: () => void;
  onSettings: () => void;
  visible: boolean;
}

function getSessionIcon(type: ConnectionConfig["type"]) {
  switch (type) {
    case "pty":
      return <TerminalSquare className="size-3.5 shrink-0" />;
    case "ssh":
      return <Globe className="size-3.5 shrink-0" />;
    case "serial":
      return <Usb className="size-3.5 shrink-0" />;
  }
}

function getSessionDescription(config: ConnectionConfig): string {
  switch (config.type) {
    case "pty":
      return "Local Shell";
    case "ssh":
      return `${config.username}@${config.host}:${config.port}`;
    case "serial":
      return `${config.portName} @ ${config.baudRate}`;
  }
}

export function Sidebar({
  sessions,
  onOpenSession,
  onManageSessions,
  onSettings,
  visible,
}: SidebarProps) {
  const [activePanel, setActivePanel] = useState<SidebarPanel>("sessions");
  const [panelWidth, setPanelWidth] = useState(224); // 14rem = 224px
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    e.preventDefault();
  }, [panelWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(400, Math.max(150, startWidth.current + delta));
      setPanelWidth(newWidth);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const togglePanel = (panel: SidebarPanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  if (!visible) return null;

  return (
    <div className="flex h-full shrink-0">
      {/* Activity Bar - icon strip */}
      <div className="flex flex-col items-center w-12 bg-card border-r border-border py-2 shrink-0 justify-between">
        <div className="flex flex-col items-center gap-1">
          <button
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-md transition-colors relative",
              activePanel === "sessions"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => togglePanel("sessions")}
            title="Saved Sessions"
          >
            <Bookmark className="size-5" />
            {activePanel === "sessions" && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-foreground rounded-r" />
            )}
          </button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            onClick={onSettings}
            title="Settings"
          >
            <Settings className="size-5" />
          </button>
        </div>
      </div>

      {/* Panel content */}
      {activePanel && (
        <div
          className="bg-card border-r border-border flex flex-col shrink-0 relative"
          style={{ width: panelWidth }}
        >          {activePanel === "sessions" && (
            <>
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sessions
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={onManageSessions}
                  title="Manage sessions"
                >
                  <Settings className="size-3.5" />
                </Button>
              </div>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {sessions.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No saved sessions.
                    <br />
                    Click the gear icon to add one.
                  </div>
                ) : (
                  <div className="py-1">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors group"
                        onClick={() => onOpenSession(session.config)}
                        title={`Connect: ${session.name}`}
                      >
                        {getSessionIcon(session.config.type)}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{session.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {getSessionDescription(session.config)}
                          </div>
                        </div>
                        <Play className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/50 transition-colors z-10"
            onMouseDown={onMouseDown}
          />
        </div>
      )}
    </div>
  );
}
