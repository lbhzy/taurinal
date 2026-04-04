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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FolderOpen } from "lucide-react";
import {
  type TerminalSettings,
  type TerminalTheme,
  BUILTIN_THEMES,
  APP_THEMES,
  getTheme,
} from "@/lib/terminal-settings";

interface SettingsDialogProps {
  open: boolean;
  settings: TerminalSettings;
  onSave: (settings: TerminalSettings) => void;
  onCancel: () => void;
}

interface SystemFonts {
  all: string[];
}

function normalizeFontName(fontName: string): string {
  return fontName.trim().replace(/^['"]|['"]$/g, "");
}

function withCurrent(list: string[], current: string): string[] {
  if (!current) return list;
  return list.includes(current) ? list : [current, ...list];
}

function isLightTheme(theme: TerminalTheme): boolean {
  // Parse hex to luminance — light backgrounds have high luminance
  const hex = theme.background.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 128;
}

const darkThemes = Object.keys(BUILTIN_THEMES).filter((n) => !isLightTheme(BUILTIN_THEMES[n]));
const lightThemes = Object.keys(BUILTIN_THEMES).filter((n) => isLightTheme(BUILTIN_THEMES[n]));
const NONE_OPTION_VALUE = "__none__";
const NO_FONTS_VALUE = "__no_fonts__";

export function SettingsDialog({
  open,
  settings: initial,
  onSave,
  onCancel,
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<TerminalSettings>(initial);
  const [allFonts, setAllFonts] = useState<string[]>([]);
  const normalizedPrimaryFont = normalizeFontName(settings.fontFamily || "");
  const normalizedFallbackFont = normalizeFontName(settings.fontFamilySecondary || "");

  useEffect(() => {
    if (open) {
      setSettings(initial);
      invoke<SystemFonts>("system_list_fonts")
        .then((fonts) => {
          const normalizedFonts = Array.from(
            new Set(fonts.all.map((font) => normalizeFontName(font)).filter(Boolean))
          ).sort((a, b) => a.localeCompare(b));

          const currentPrimary = normalizeFontName(initial.fontFamily || "");
          const currentFallback = normalizeFontName(initial.fontFamilySecondary || "");

          setAllFonts(withCurrent(withCurrent(normalizedFonts, currentPrimary), currentFallback));
        })
        .catch(() => {
          const currentPrimary = normalizeFontName(initial.fontFamily || "");
          const currentFallback = normalizeFontName(initial.fontFamilySecondary || "");
          const fallbackList = currentPrimary ? [currentPrimary] : [];
          setAllFonts(withCurrent(fallbackList, currentFallback));
        });
    }
  }, [open, initial]);

  const theme = getTheme(settings);

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
          {/* App Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">App Theme</Label>
            <Select
              value={settings.appTheme}
              onValueChange={(value) => update({ appTheme: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select app theme" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectGroup>
                  <SelectLabel>Dark</SelectLabel>
                  {APP_THEMES.filter((t) => t.dark).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Light</SelectLabel>
                  {APP_THEMES.filter((t) => !t.dark).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Terminal Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Terminal Color Theme</Label>
            <Select
              value={settings.themeName}
              onValueChange={(value) => update({ themeName: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select terminal theme" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectGroup>
                  <SelectLabel>Dark</SelectLabel>
                  {darkThemes.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Light</SelectLabel>
                  {lightThemes.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
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
                value={normalizedPrimaryFont || undefined}
                onValueChange={(value) => update({ fontFamily: normalizeFontName(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select font family" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {allFonts.length === 0 && (
                    <SelectItem value={NO_FONTS_VALUE} disabled>
                      {normalizedPrimaryFont || "No fonts found"}
                    </SelectItem>
                  )}
                  {allFonts.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fallback Font</Label>
              <Select
                value={normalizedFallbackFont || NONE_OPTION_VALUE}
                onValueChange={(value) =>
                  update({
                    fontFamilySecondary:
                      value === NONE_OPTION_VALUE ? "" : normalizeFontName(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fallback font" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NONE_OPTION_VALUE}>None</SelectItem>
                  {allFonts.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div />
          </div>

          {/* Cursor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cursor Style</Label>
              <Select
                value={settings.cursorStyle}
                onValueChange={(value) =>
                  update({
                    cursorStyle: value as "block" | "underline" | "bar",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cursor style" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="underline">Underline</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cursor Blink</Label>
              <Select
                value={settings.cursorBlink ? "on" : "off"}
                onValueChange={(value) => update({ cursorBlink: value === "on" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cursor blink" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
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
