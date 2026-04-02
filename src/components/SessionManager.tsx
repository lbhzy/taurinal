import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, TerminalSquare, Globe, Usb, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedSession } from "@/lib/saved-sessions";
import type { ConnectionConfig } from "./Terminal";

interface SerialPortInfo {
  port_name: string;
  port_type: string;
}

interface SessionManagerProps {
  open: boolean;
  sessions: SavedSession[];
  onSave: (sessions: SavedSession[]) => void;
  onCancel: () => void;
}

const COMMON_BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600] as const;

export function SessionManager({
  open,
  sessions: initialSessions,
  onSave,
  onCancel,
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<SavedSession[]>(initialSessions);
  const [name, setName] = useState("");
  const [connType, setConnType] = useState<"pty" | "ssh" | "serial">("pty");
  const [editingId, setEditingId] = useState<string | null>(null);

  // PTY fields
  const [ptyCommand, setPtyCommand] = useState("");

  // SSH fields
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("root");
  const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [keyPath, setKeyPath] = useState("~/.ssh/id_rsa");

  // Serial fields
  const [serialPorts, setSerialPorts] = useState<SerialPortInfo[]>([]);
  const [portName, setPortName] = useState("");
  const [baudRate, setBaudRate] = useState(115200);
  const [baudRateInput, setBaudRateInput] = useState("115200");

  useEffect(() => {
    if (open) {
      setSessions(initialSessions);
      resetForm();
    }
  }, [open]);

  // Fetch serial ports when serial type is selected
  useEffect(() => {
    if (connType === "serial" && open) {
      invoke<SerialPortInfo[]>("serial_list_ports").then((ports) => {
        setSerialPorts(ports);
        if (ports.length > 0 && !portName) {
          setPortName(ports[0].port_name);
        }
      }).catch(() => {});
    }
  }, [connType, open]);

  const resetForm = () => {
    setName("");
    setConnType("pty");
    setPtyCommand("");
    setHost("127.0.0.1");
    setPort(22);
    setUsername("root");
    setAuthMethod("password");
    setPassword("");
    setKeyPath("~/.ssh/id_rsa");
    setPortName("");
    setBaudRate(115200);
    setBaudRateInput("115200");
    setEditingId(null);
  };

  const loadConfigToForm = (session: SavedSession) => {
    setName(session.name);
    setConnType(session.config.type);
    switch (session.config.type) {
      case "pty":
        setPtyCommand(session.config.command || "");
        break;
      case "ssh":
        setHost(session.config.host);
        setPort(session.config.port);
        setUsername(session.config.username);
        setAuthMethod(session.config.authMethod);
        setPassword(session.config.password || "");
        setKeyPath(session.config.keyPath || "~/.ssh/id_rsa");
        break;
      case "serial":
        setPortName(session.config.portName);
        setBaudRate(session.config.baudRate);
        setBaudRateInput(String(session.config.baudRate));
        break;
    }
  };

  const onBaudRateInputChange = (value: string) => {
    setBaudRateInput(value);
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      setBaudRate(parsed);
    }
  };

  const selectedCommonBaudRate = COMMON_BAUD_RATES.some((rate) => rate === baudRate)
    ? String(baudRate)
    : "custom";

  const buildConfig = (): ConnectionConfig => {
    switch (connType) {
      case "pty":
        return { type: "pty", command: ptyCommand || undefined };
      case "ssh":
        return {
          type: "ssh",
          host,
          port,
          username,
          authMethod,
          password: password || undefined,
          keyPath: authMethod === "key" ? keyPath : undefined,
        };
      case "serial":
        return { type: "serial", portName, baudRate };
    }
  };

  const addSession = () => {
    if (!name.trim()) return;
    if (editingId) {
      // Update existing session
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingId ? { ...s, name: name.trim(), config: buildConfig() } : s
        )
      );
      setEditingId(null);
    } else {
      // Add new session
      const session: SavedSession = {
        id: crypto.randomUUID(),
        name: name.trim(),
        config: buildConfig(),
      };
      setSessions((prev) => [...prev, session]);
    }
    resetForm();
  };

  const startEditing = (session: SavedSession) => {
    setEditingId(session.id);
    loadConfigToForm(session);
  };

  const cancelEditing = () => {
    setEditingId(null);
    resetForm();
  };

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) {
      cancelEditing();
    }
  };

  const getIcon = (type: ConnectionConfig["type"]) => {
    switch (type) {
      case "pty":
        return <TerminalSquare className="size-3.5 shrink-0" />;
      case "ssh":
        return <Globe className="size-3.5 shrink-0" />;
      case "serial":
        return <Usb className="size-3.5 shrink-0" />;
    }
  };

  const getDesc = (config: ConnectionConfig) => {
    switch (config.type) {
      case "pty":
        return config.command || "Local Shell";
      case "ssh":
        return `${config.username}@${config.host}:${config.port}`;
      case "serial":
        return `${config.portName} @ ${config.baudRate}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Saved Sessions</DialogTitle>
          <DialogDescription>
            Add, edit, or remove saved connection sessions for quick access.
          </DialogDescription>
        </DialogHeader>

        {/* Existing sessions */}
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No saved sessions yet. Add one below.
            </p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 group",
                editingId === s.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-muted/30"
              )}
            >
              {getIcon(s.config.type)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {getDesc(s.config)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
                onClick={() => startEditing(s)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive-foreground"
                onClick={() => removeSession(s.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add/edit session */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {editingId ? "Edit Session" : "Add New Session"}
            </div>
            {editingId && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={cancelEditing}>
                <X className="size-3 mr-1" />
                Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Session Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Server"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={connType}
                onChange={(e) =>
                  setConnType(e.target.value as "pty" | "ssh" | "serial")
                }
                className="h-8 text-xs"
              >
                <option value="pty">Local Shell</option>
                <option value="ssh">SSH</option>
                <option value="serial">Serial</option>
              </Select>
            </div>
          </div>

          {connType === "pty" && (
            <div className="space-y-1">
              <Label className="text-xs">Command (optional)</Label>
              <Input
                value={ptyCommand}
                onChange={(e) => setPtyCommand(e.target.value)}
                placeholder="Leave empty for default shell"
                className="h-8 text-xs font-mono"
              />
            </div>
          )}

          {connType === "ssh" && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Host</Label>
                  <Input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Port</Label>
                  <Input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="h-8 text-xs"
                    min={1}
                    max={65535}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Auth</Label>
                  <Select
                    value={authMethod}
                    onChange={(e) =>
                      setAuthMethod(e.target.value as "password" | "key")
                    }
                    className="h-8 text-xs"
                  >
                    <option value="password">Password</option>
                    <option value="key">Key File</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 text-xs"
                  placeholder={
                    authMethod === "key" ? "Passphrase (optional)" : ""
                  }
                />
              </div>
              {authMethod === "key" && (
                <div className="space-y-1">
                  <Label className="text-xs">Key Path</Label>
                  <Input
                    value={keyPath}
                    onChange={(e) => setKeyPath(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {connType === "serial" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Port</Label>
                <Select
                  value={portName}
                  onChange={(e) => setPortName(e.target.value)}
                  className="h-8 text-xs"
                >
                  {serialPorts.length === 0 && (
                    <option value="">No ports found</option>
                  )}
                  {serialPorts.map((p) => (
                    <option key={p.port_name} value={p.port_name}>
                      {p.port_name} ({p.port_type})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Baud Rate</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={baudRateInput}
                    onChange={(e) => onBaudRateInputChange(e.target.value)}
                    className="h-8 text-xs flex-1"
                    placeholder="115200"
                  />
                  <Select
                    value={selectedCommonBaudRate}
                    onChange={(e) => {
                      if (e.target.value === "custom") return;
                      onBaudRateInputChange(e.target.value);
                    }}
                    className="h-8 text-xs w-[118px]"
                  >
                    <option value="custom">Custom</option>
                    {COMMON_BAUD_RATES.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={addSession}
            disabled={!name.trim()}
          >
            {editingId ? (
              <><Check className="size-3.5 mr-1" />Update Session</>
            ) : (
              <><Plus className="size-3.5 mr-1" />Add Session</>
            )}
          </Button>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(sessions)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
