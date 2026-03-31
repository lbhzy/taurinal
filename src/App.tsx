import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Terminal, type ConnectionConfig, type TerminalHandle } from "./components/Terminal";
import { ConnectDialog } from "./components/ConnectDialog";
import { QuickCommandBar } from "./components/QuickCommandBar";
import { QuickCommandManager } from "./components/QuickCommandManager";
import { BottomPanel, type PanelTab } from "./components/BottomPanel";
import { HexView } from "./components/HexView";
import { Sidebar } from "./components/Sidebar";
import { SessionManager } from "./components/SessionManager";
import { SettingsDialog } from "./components/SettingsDialog";
import { loadQuickCommands, saveQuickCommands, type QuickCommand } from "@/lib/quick-commands";
import { loadSavedSessions, saveSessions, type SavedSession } from "@/lib/saved-sessions";
import { loadTerminalSettings, saveTerminalSettings, type TerminalSettings } from "@/lib/terminal-settings";
import { Button } from "@/components/ui/button";
import {
  Plus, X, TerminalSquare, Globe, Usb, Zap, Binary,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabInfo {
  id: number;
  label: string;
  config: ConnectionConfig;
}

function getTabLabel(config: ConnectionConfig): string {
  switch (config.type) {
    case "pty":
      return config.command ? config.command.split(/\s/)[0].split("/").pop()! : "Local Shell";
    case "ssh":
      return `${config.username}@${config.host}`;
    case "serial":
      return config.portName;
  }
}

function getTabIcon(type: ConnectionConfig["type"]) {
  switch (type) {
    case "pty":
      return <TerminalSquare className="size-3.5" />;
    case "ssh":
      return <Globe className="size-3.5" />;
    case "serial":
      return <Usb className="size-3.5" />;
  }
}

// VS Code-style layout icons
function SidebarIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="11" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="2.5" width="4" height="11" rx="0" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function PanelIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="11" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="9.5" width="13" height="4" rx="0" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function App() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTab, setActiveTab] = useState(-1);
  const [nextId, setNextId] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>([]);
  const [showCommandManager, setShowCommandManager] = useState(false);
  const terminalRefs = useRef<Map<number, TerminalHandle>>(new Map());
  const [hexDataMap, setHexDataMap] = useState<Map<number, string>>(new Map());
  const [hexEnabled, setHexEnabled] = useState(false);
  const hexEnabledRef = useRef(hexEnabled);
  hexEnabledRef.current = hexEnabled;

  // Saved sessions
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showSessionManager, setShowSessionManager] = useState(false);

  // Layout visibility
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);

  // Terminal size tracking
  const [terminalSize, setTerminalSize] = useState<{ rows: number; cols: number } | null>(null);

  // Terminal settings
  const [terminalSettings, setTerminalSettings] = useState<TerminalSettings>({
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
    cursorStyle: "block",
    themeName: "Dark (Default)",
  });
  const [showSettings, setShowSettings] = useState(false);

  // Load configs from Tauri on mount
  useEffect(() => {
    loadQuickCommands().then(setQuickCommands);
    loadSavedSessions().then(setSavedSessions);
    loadTerminalSettings().then(setTerminalSettings);
  }, []);

  const MAX_HEX_SIZE = 64 * 1024; // Keep last 64KB per tab

  const addTab = useCallback(
    (config: ConnectionConfig) => {
      const id = nextId;
      setNextId((n) => n + 1);
      setTabs((prev) => [...prev, { id, label: getTabLabel(config), config }]);
      setActiveTab(id);
      setShowDialog(false);
    },
    [nextId]
  );

  const closeTab = useCallback(
    (id: number) => {
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        if (activeTab === id) {
          if (filtered.length > 0) {
            setActiveTab(filtered[filtered.length - 1].id);
          } else {
            setActiveTab(-1);
          }
        }
        return filtered;
      });
    },
    [activeTab]
  );

  const sendQuickCommand = useCallback(
    (command: string) => {
      const handle = terminalRefs.current.get(activeTab);
      if (handle) handle.sendCommand(command);
    },
    [activeTab]
  );

  const handleSaveCommands = useCallback((cmds: QuickCommand[]) => {
    setQuickCommands(cmds);
    saveQuickCommands(cmds);
    setShowCommandManager(false);
  }, []);

  const handleSaveSessions = useCallback((sessions: SavedSession[]) => {
    setSavedSessions(sessions);
    saveSessions(sessions);
    setShowSessionManager(false);
  }, []);

  const handleSaveSettings = useCallback((s: TerminalSettings) => {
    setTerminalSettings(s);
    saveTerminalSettings(s);
    setShowSettings(false);
  }, []);

  const setTerminalRef = useCallback(
    (tabId: number) => (handle: TerminalHandle | null) => {
      if (handle) {
        terminalRefs.current.set(tabId, handle);
      } else {
        terminalRefs.current.delete(tabId);
      }
    },
    []
  );

  const onTerminalOutput = useCallback(
    (tabId: number) => (data: string) => {
      if (!hexEnabledRef.current) return;
      setHexDataMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(tabId) ?? "";
        let updated = existing + data;
        if (updated.length > MAX_HEX_SIZE) {
          updated = updated.slice(updated.length - MAX_HEX_SIZE);
        }
        next.set(tabId, updated);
        return next;
      });
    },
    [MAX_HEX_SIZE]
  );

  const onTerminalResize = useCallback(
    (tabId: number) => (rows: number, cols: number) => {
      if (tabId === activeTab) {
        setTerminalSize({ rows, cols });
      }
    },
    [activeTab]
  );

  const activeTabInfo = tabs.find((t) => t.id === activeTab);

  const clearHexData = useCallback(() => {
    setHexDataMap((prev) => {
      const next = new Map(prev);
      next.set(activeTab, "");
      return next;
    });
  }, [activeTab]);

  const currentHexData = hexDataMap.get(activeTab) ?? "";

  const bottomTabs: PanelTab[] = useMemo(
    () => [
      {
        id: "quick-commands",
        label: "Quick Commands",
        icon: <Zap className="size-3" />,
        content: (
          <QuickCommandBar
            commands={quickCommands}
            onSend={sendQuickCommand}
            onManage={() => setShowCommandManager(true)}
          />
        ),
      },
      {
        id: "hex-view",
        label: "Hex",
        icon: <Binary className="size-3" />,
        content: (
          <HexView
            data={currentHexData}
            enabled={hexEnabled}
            onToggle={() => setHexEnabled((v) => !v)}
            onClear={clearHexData}
          />
        ),
      },
    ],
    [quickCommands, sendQuickCommand, currentHexData, clearHexData, hexEnabled]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Title Bar - macOS traffic lights overlay on the left */}
      <div
        data-tauri-drag-region
        className="titlebar flex items-center h-11 bg-card border-b border-border shrink-0 select-none"
      >
        {/* Left spacer for macOS traffic lights */}
        <div className="w-[78px] shrink-0" data-tauri-drag-region />

        {/* Title / drag area */}
        <div className="flex-1 text-xs text-muted-foreground font-medium" data-tauri-drag-region>
          Xterm App
        </div>

        {/* Layout toggle buttons */}
        <div className="flex items-center gap-0.5 px-2 shrink-0 titlebar-buttons">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              showSidebar
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setShowSidebar((v) => !v)}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            <SidebarIcon active={showSidebar} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              showBottomPanel
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setShowBottomPanel((v) => !v)}
            title={showBottomPanel ? "Hide bottom panel" : "Show bottom panel"}
          >
            <PanelIcon active={showBottomPanel} />
          </Button>
        </div>
      </div>

      {/* Main Area: Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          sessions={savedSessions}
          onOpenSession={addTab}
          onManageSessions={() => setShowSessionManager(true)}
          onSettings={() => setShowSettings(true)}
          visible={showSidebar}
        />

        {/* Content: Tab Bar + Terminal + Bottom Panel */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tab Bar - only inside terminal area */}
          <div className="flex items-center bg-card border-b border-border h-9 shrink-0 overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "group flex items-center gap-2 px-3 h-full cursor-pointer border-r border-border text-xs select-none transition-colors",
                  activeTab === tab.id
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {getTabIcon(tab.config.type)}
                <span className="max-w-[140px] truncate">{tab.label}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-full w-9 rounded-none text-muted-foreground"
              onClick={() => setShowDialog(true)}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Terminal Area */}
          <div className="flex-1 relative min-h-0">
            {tabs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <button
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                  onClick={() => setShowDialog(true)}
                >
                  <Plus className="size-4" />
                  New Connection
                </button>
              </div>
            ) : (
              tabs.map((tab) => (
                <Terminal
                  key={tab.id}
                  ref={setTerminalRef(tab.id)}
                  config={tab.config}
                  settings={terminalSettings}
                  active={activeTab === tab.id}
                  onOutput={onTerminalOutput(tab.id)}
                  onResize={onTerminalResize(tab.id)}
                />
              ))
            )}
          </div>

          {/* Bottom Panel */}
          {showBottomPanel && <BottomPanel tabs={bottomTabs} />}
        </div>
      </div>

      {/* Connection Dialog */}
      <ConnectDialog
        open={showDialog}
        onConnect={addTab}
        onCancel={() => setShowDialog(false)}
      />

      {/* Quick Command Manager */}
      <QuickCommandManager
        open={showCommandManager}
        commands={quickCommands}
        onSave={handleSaveCommands}
        onCancel={() => setShowCommandManager(false)}
      />

      {/* Session Manager */}
      <SessionManager
        open={showSessionManager}
        sessions={savedSessions}
        onSave={handleSaveSessions}
        onCancel={() => setShowSessionManager(false)}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        settings={terminalSettings}
        onSave={handleSaveSettings}
        onCancel={() => setShowSettings(false)}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between h-6 px-3 bg-card border-t border-border shrink-0 text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-3">
          {activeTabInfo && (
            <>
              <span className="flex items-center gap-1">
                {getTabIcon(activeTabInfo.config.type)}
                {activeTabInfo.label}
              </span>
              {activeTabInfo.config.type === "ssh" && (
                <span>{activeTabInfo.config.host}:{activeTabInfo.config.port}</span>
              )}
              {activeTabInfo.config.type === "serial" && (
                <span>{activeTabInfo.config.portName} @ {activeTabInfo.config.baudRate}</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hexEnabled && (
            <span className="text-green-400">HEX REC</span>
          )}
          {tabs.length > 0 && terminalSize && (
            <span className="font-mono">
              {terminalSize.cols}x{terminalSize.rows}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
