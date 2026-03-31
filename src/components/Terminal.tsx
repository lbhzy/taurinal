import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";

import { cn } from "@/lib/utils";
import { type TerminalSettings, getTheme } from "@/lib/terminal-settings";

export type ConnectionType = "pty" | "ssh" | "serial";

export interface PtyConfig {
  type: "pty";
  command?: string;
}

export interface SshConfig {
  type: "ssh";
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  password?: string;
  keyPath?: string;
}

export interface SerialConfig {
  type: "serial";
  portName: string;
  baudRate: number;
}

export type ConnectionConfig = PtyConfig | SshConfig | SerialConfig;

interface TerminalProps {
  config: ConnectionConfig;
  active: boolean;
  settings: TerminalSettings;
  onOutput?: (data: string) => void;
  onResize?: (rows: number, cols: number) => void;
}

export interface TerminalHandle {
  sendCommand: (command: string) => void;
  getSize: () => { rows: number; cols: number } | null;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal({ config, active, settings, onOutput, onResize }, ref) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const onOutputRef = useRef(onOutput);
  onOutputRef.current = onOutput;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useImperativeHandle(ref, () => ({
    sendCommand: (command: string) => {
      if (sessionIdRef.current !== null) {
        invoke("session_write", { id: sessionIdRef.current, data: command });
      }
    },
    getSize: () => {
      const xterm = xtermRef.current;
      if (!xterm) return null;
      return { rows: xterm.rows, cols: xterm.cols };
    },
  }));

  useEffect(() => {
    if (!termRef.current) return;

    const xterm = new XTerm({
      cursorBlink: settings.cursorBlink,
      cursorStyle: settings.cursorStyle,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      theme: getTheme(settings),
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(termRef.current);
    fitAddon.fit();
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;
    onResizeRef.current?.(xterm.rows, xterm.cols);

    let sessionId: number | null = null;
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    async function init() {
      const rows = xterm.rows;
      const cols = xterm.cols;

      try {
        switch (config.type) {
          case "pty":
            sessionId = await invoke<number>("pty_spawn", {
              rows,
              cols,
              command: config.command ?? null,
            });
            break;
          case "ssh":
            sessionId = await invoke<number>("ssh_connect", {
              host: config.host,
              port: config.port,
              username: config.username,
              authMethod: config.authMethod,
              password: config.password ?? null,
              keyPath: config.keyPath ?? null,
              rows,
              cols,
            });
            break;
          case "serial":
            sessionId = await invoke<number>("serial_connect", {
              portName: config.portName,
              baudRate: config.baudRate,
            });
            break;
        }
      } catch (e) {
        xterm.write(`\r\n\x1b[31mConnection failed: ${e}\x1b[0m\r\n`);
        return;
      }

      sessionIdRef.current = sessionId;

      unlistenOutput = await listen<string>(
        `session-output-${sessionId}`,
        (event) => {
          xterm.write(event.payload);
          onOutputRef.current?.(event.payload);
        }
      );

      unlistenExit = await listen<void>(
        `session-exit-${sessionId}`,
        () => {
          xterm.write("\r\n\x1b[33m[Session ended]\x1b[0m\r\n");
        }
      );

      xterm.onData((data) => {
        if (sessionIdRef.current !== null) {
          invoke("session_write", { id: sessionIdRef.current, data });
        }
      });
    }

    init();

    const handleResize = () => {
      fitAddon.fit();
      onResizeRef.current?.(xterm.rows, xterm.cols);
      if (sessionIdRef.current !== null) {
        invoke("session_resize", {
          id: sessionIdRef.current,
          rows: xterm.rows,
          cols: xterm.cols,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Observe container resize for layout changes (panel show/hide, sidebar toggle)
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (termRef.current) {
      resizeObserver.observe(termRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      unlistenOutput?.();
      unlistenExit?.();
      if (sessionIdRef.current !== null) {
        invoke("session_close", { id: sessionIdRef.current });
      }
      xterm.dispose();
    };
  }, []);

  // Refit when tab becomes active
  useEffect(() => {
    if (active && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 0);
    }
  }, [active]);

  // Apply settings changes to existing terminal
  useEffect(() => {
    const xterm = xtermRef.current;
    if (!xterm) return;
    xterm.options.fontSize = settings.fontSize;
    xterm.options.fontFamily = settings.fontFamily;
    xterm.options.cursorBlink = settings.cursorBlink;
    xterm.options.cursorStyle = settings.cursorStyle;
    xterm.options.theme = getTheme(settings);
    fitAddonRef.current?.fit();
  }, [settings]);

  return (
    <div
      ref={termRef}
      className={cn("w-full h-full", active ? "block" : "hidden")}
    />
  );
});
