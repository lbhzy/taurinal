import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ConnectionConfig } from "./Terminal";
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
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalSquare, Globe, Usb } from "lucide-react";

interface SerialPortInfo {
  port_name: string;
  port_type: string;
}

interface ConnectDialogProps {
  open: boolean;
  onConnect: (config: ConnectionConfig) => void;
  onCancel: () => void;
}

export function ConnectDialog({ open, onConnect, onCancel }: ConnectDialogProps) {
  const [tab, setTab] = useState<"pty" | "ssh" | "serial">("pty");

  // PTY fields
  const [ptyCommand, setPtyCommand] = useState("");

  // SSH fields
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [keyPath, setKeyPath] = useState("~/.ssh/id_rsa");

  // Serial fields
  const [serialPorts, setSerialPorts] = useState<SerialPortInfo[]>([]);
  const [portName, setPortName] = useState("");
  const [baudRate, setBaudRate] = useState(115200);

  useEffect(() => {
    if (tab === "serial" && open) {
      invoke<SerialPortInfo[]>("serial_list_ports").then((ports) => {
        setSerialPorts(ports);
        if (ports.length > 0 && !portName) {
          setPortName(ports[0].port_name);
        }
      });
    }
  }, [tab, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    switch (tab) {
      case "pty":
        onConnect({ type: "pty", command: ptyCommand || undefined });
        break;
      case "ssh":
        onConnect({
          type: "ssh",
          host,
          port,
          username,
          authMethod,
          password: password || undefined,
          keyPath: authMethod === "key" ? keyPath : undefined,
        });
        break;
      case "serial":
        onConnect({ type: "serial", portName, baudRate });
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Connection</DialogTitle>
          <DialogDescription>
            Choose a connection type and configure the settings.
          </DialogDescription>
        </DialogHeader>

        {/* Connection Type Tabs */}
        <TabsList className="w-full">
          <TabsTrigger
            active={tab === "pty"}
            onClick={() => setTab("pty")}
            className="flex-1 gap-1.5"
          >
            <TerminalSquare className="size-3.5" />
            Local Shell
          </TabsTrigger>
          <TabsTrigger
            active={tab === "ssh"}
            onClick={() => setTab("ssh")}
            className="flex-1 gap-1.5"
          >
            <Globe className="size-3.5" />
            SSH
          </TabsTrigger>
          <TabsTrigger
            active={tab === "serial"}
            onClick={() => setTab("serial")}
            className="flex-1 gap-1.5"
          >
            <Usb className="size-3.5" />
            Serial
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {tab === "pty" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Open a new local shell session.
              </p>
              <div className="space-y-2">
                <Label htmlFor="pty-command">Command (optional)</Label>
                <Input
                  id="pty-command"
                  value={ptyCommand}
                  onChange={(e) => setPtyCommand(e.target.value)}
                  placeholder="Leave empty for default shell"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  e.g. /bin/bash, python3, htop
                </p>
              </div>
            </div>
          )}

          {tab === "ssh" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="ssh-host">Host</Label>
                  <Input
                    id="ssh-host"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssh-port">Port</Label>
                  <Input
                    id="ssh-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    min={1}
                    max={65535}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssh-user">Username</Label>
                <Input
                  id="ssh-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="root"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssh-auth">Auth Method</Label>
                <Select
                  id="ssh-auth"
                  value={authMethod}
                  onChange={(e) =>
                    setAuthMethod(e.target.value as "password" | "key")
                  }
                >
                  <option value="password">Password</option>
                  <option value="key">Key File</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssh-password">Password</Label>
                <Input
                  id="ssh-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    authMethod === "key" ? "Key passphrase (optional)" : ""
                  }
                  required={authMethod === "password"}
                />
              </div>
              {authMethod === "key" && (
                <div className="space-y-2">
                  <Label htmlFor="ssh-key">Key Path</Label>
                  <Input
                    id="ssh-key"
                    value={keyPath}
                    onChange={(e) => setKeyPath(e.target.value)}
                    placeholder="~/.ssh/id_rsa"
                    required
                  />
                </div>
              )}
            </>
          )}

          {tab === "serial" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="serial-port">Port</Label>
                <Select
                  id="serial-port"
                  value={portName}
                  onChange={(e) => setPortName(e.target.value)}
                  required
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
              <div className="space-y-2">
                <Label htmlFor="serial-baud">Baud Rate</Label>
                <Select
                  id="serial-baud"
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                >
                  {[
                    9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600,
                  ].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Connect</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
