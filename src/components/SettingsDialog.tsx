import { useState } from "react";
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
import { FolderOpen } from "lucide-react";
import {
  type TerminalSettings,
  BUILTIN_THEMES,
  getTheme,
} from "@/lib/terminal-settings";

interface SettingsDialogProps {
  open: boolean;
  settings: TerminalSettings;
  onSave: (settings: TerminalSettings) => void;
  onCancel: () => void;
}

const FONT_OPTIONS = [
  'Menlo, Monaco, "Courier New", monospace',
  '"Fira Code", monospace',
  '"JetBrains Mono", monospace',
  '"Source Code Pro", monospace',
  '"Cascadia Code", monospace',
  '"IBM Plex Mono", monospace',
  '"SF Mono", monospace',
  'Consolas, monospace',
];

export function SettingsDialog({
  open,
  settings: initial,
  onSave,
  onCancel,
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<TerminalSettings>(initial);

  const theme = getTheme(settings);
  const themeNames = Object.keys(BUILTIN_THEMES);

  const update = (patch: Partial<TerminalSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Terminal Settings</DialogTitle>
          <DialogDescription>
            Configure terminal appearance and behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color Theme</Label>
            <Select
              value={settings.themeName}
              onChange={(e) => update({ themeName: e.target.value })}
            >
              {themeNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            {/* Theme preview */}
            <div
              className="rounded-md border border-border p-3 font-mono text-xs leading-relaxed"
              style={{ background: theme.background, color: theme.foreground }}
            >
              <div>
                <span style={{ color: theme.green }}>user@host</span>
                <span style={{ color: theme.foreground }}>:</span>
                <span style={{ color: theme.blue }}>~/project</span>
                <span style={{ color: theme.foreground }}>$ </span>
                <span style={{ color: theme.yellow }}>echo</span>
                <span style={{ color: theme.foreground }}> </span>
                <span style={{ color: theme.red }}>"Hello World"</span>
              </div>
              <div style={{ color: theme.foreground }}>Hello World</div>
              <div>
                <span style={{ color: theme.cyan }}>➜</span>
                <span style={{ color: theme.magenta }}> npm </span>
                <span style={{ color: theme.foreground }}>run build</span>
              </div>
            </div>
          </div>

          {/* Font */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Family</Label>
              <Select
                value={settings.fontFamily}
                onChange={(e) => update({ fontFamily: e.target.value })}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font.split(",")[0].replace(/"/g, "")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Size</Label>
              <Input
                type="number"
                min={8}
                max={32}
                value={settings.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="h-9"
              />
            </div>
          </div>

          {/* Cursor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cursor Style</Label>
              <Select
                value={settings.cursorStyle}
                onChange={(e) =>
                  update({
                    cursorStyle: e.target.value as "block" | "underline" | "bar",
                  })
                }
              >
                <option value="block">Block</option>
                <option value="underline">Underline</option>
                <option value="bar">Bar</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cursor Blink</Label>
              <Select
                value={settings.cursorBlink ? "on" : "off"}
                onChange={(e) =>
                  update({ cursorBlink: e.target.value === "on" })
                }
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto text-muted-foreground"
            onClick={() => invoke("config_open_folder")}
          >
            <FolderOpen className="size-4 mr-1.5" />
            Open Config Folder
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(settings)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
