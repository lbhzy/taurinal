import { useState, useEffect } from "react";
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
import { Plus, Trash2, Pencil, Check, X, Power, Regex } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trigger, TriggerAction } from "@/lib/triggers";

interface TriggerManagerProps {
  open: boolean;
  triggers: Trigger[];
  onSave: (triggers: Trigger[]) => void;
  onCancel: () => void;
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function TriggerManager({
  open,
  triggers: initialTriggers,
  onSave,
  onCancel,
}: TriggerManagerProps) {
  const [triggers, setTriggers] = useState<Trigger[]>(initialTriggers);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [highlight, setHighlight] = useState("#3b82f6");
  const [tooltip, setTooltip] = useState("");
  const [clickCommand, setClickCommand] = useState("");
  const [autoCommand, setAutoCommand] = useState("");
  const [patternError, setPatternError] = useState("");

  useEffect(() => {
    if (open) {
      setTriggers(initialTriggers);
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPattern("");
    setHighlight("#3b82f6");
    setTooltip("");
    setClickCommand("");
    setAutoCommand("");
    setPatternError("");
  };

  const validatePattern = (p: string): boolean => {
    try {
      new RegExp(p);
      setPatternError("");
      return true;
    } catch (e: any) {
      setPatternError(e.message || "Invalid regex");
      return false;
    }
  };

  const loadTriggerToForm = (trigger: Trigger) => {
    setName(trigger.name);
    setPattern(trigger.pattern);
    setHighlight(trigger.actions.highlight || "#3b82f6");
    setTooltip(trigger.actions.tooltip || "");
    setClickCommand(trigger.actions.clickCommand || "");
    setAutoCommand(trigger.actions.autoCommand || "");
    setPatternError("");
  };

  const buildActions = (): TriggerAction => {
    const actions: TriggerAction = {};
    if (highlight) actions.highlight = highlight;
    if (tooltip.trim()) actions.tooltip = tooltip.trim();
    if (clickCommand.trim()) actions.clickCommand = clickCommand.trim();
    if (autoCommand.trim()) actions.autoCommand = autoCommand.trim();
    return actions;
  };

  const addOrUpdateTrigger = () => {
    if (!name.trim() || !pattern.trim()) return;
    if (!validatePattern(pattern)) return;

    if (editingId) {
      setTriggers((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, name: name.trim(), pattern, actions: buildActions() }
            : t
        )
      );
    } else {
      setTriggers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          pattern,
          enabled: true,
          actions: buildActions(),
        },
      ]);
    }
    resetForm();
  };

  const startEditing = (trigger: Trigger) => {
    setEditingId(trigger.id);
    loadTriggerToForm(trigger);
  };

  const cancelEditing = () => resetForm();

  const removeTrigger = (id: string) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  };

  const toggleTrigger = (id: string) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const getActionSummary = (actions: TriggerAction): string => {
    const parts: string[] = [];
    if (actions.highlight) parts.push("highlight");
    if (actions.tooltip) parts.push("tooltip");
    if (actions.clickCommand) parts.push("click→cmd");
    if (actions.autoCommand) parts.push("auto→cmd");
    return parts.join(", ") || "no actions";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Triggers</DialogTitle>
          <DialogDescription>
            Define regex patterns to match terminal output and trigger actions.
          </DialogDescription>
        </DialogHeader>

        {/* Existing triggers */}
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {triggers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No triggers yet. Add one below.
            </p>
          )}
          {triggers.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 group",
                editingId === t.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-muted/30"
              )}
            >
              {/* Enable/disable switch */}
              <button
                className={cn(
                  "relative w-7 h-4 rounded-full transition-colors shrink-0",
                  t.enabled ? "bg-primary" : "bg-muted-foreground/30"
                )}
                onClick={() => toggleTrigger(t.id)}
                title={t.enabled ? "Disable trigger" : "Enable trigger"}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                    t.enabled ? "translate-x-3.5" : "translate-x-0.5"
                  )}
                />
              </button>

              {/* Color dot */}
              {t.actions.highlight && (
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.actions.highlight }}
                />
              )}

              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-medium truncate", !t.enabled && "text-muted-foreground/50")}>
                  {t.name}
                </div>
                <div className="text-[11px] text-muted-foreground/60 font-mono truncate">
                  /{t.pattern}/ — {getActionSummary(t.actions)}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
                onClick={() => startEditing(t)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive-foreground"
                onClick={() => removeTrigger(t.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add/edit form */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {editingId ? "Edit Trigger" : "Add New Trigger"}
            </div>
            {editingId && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={cancelEditing}>
                <X className="size-3 mr-1" />
                Cancel Edit
              </Button>
            )}
          </div>

          {/* Name + Pattern */}
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Error alert"
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Regex className="size-3" />
                Pattern (regex)
              </Label>
              <Input
                value={pattern}
                onChange={(e) => {
                  setPattern(e.target.value);
                  if (e.target.value) validatePattern(e.target.value);
                }}
                placeholder="error|fail|exception"
                className={cn(
                  "h-8 text-xs font-mono",
                  patternError && "border-destructive"
                )}
              />
              {patternError && (
                <p className="text-[10px] text-destructive">{patternError}</p>
              )}
            </div>
          </div>

          {/* Highlight color */}
          <div className="space-y-1">
            <Label className="text-xs">Highlight Color</Label>
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={cn(
                    "w-5 h-5 rounded-full transition-all border-2",
                    highlight === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setHighlight(c)}
                />
              ))}
              <Input
                type="color"
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                className="w-8 h-5 p-0 border-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Tooltip */}
          <div className="space-y-1">
            <Label className="text-xs">Hover Tooltip (optional)</Label>
            <Input
              value={tooltip}
              onChange={(e) => setTooltip(e.target.value)}
              placeholder="Custom tooltip text..."
              className="h-8 text-xs"
            />
          </div>

          {/* Click command */}
          <div className="space-y-1">
            <Label className="text-xs">Click to Send Command (optional)</Label>
            <Input
              value={clickCommand}
              onChange={(e) => setClickCommand(e.target.value)}
              placeholder="e.g. tail -f /var/log/syslog"
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* Auto command */}
          <div className="space-y-1">
            <Label className="text-xs">Auto Send Command (optional)</Label>
            <Input
              value={autoCommand}
              onChange={(e) => setAutoCommand(e.target.value)}
              placeholder="Sent automatically when pattern matches"
              className="h-8 text-xs font-mono"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={addOrUpdateTrigger}
            disabled={!name.trim() || !pattern.trim() || !!patternError}
          >
            {editingId ? (
              <><Check className="size-3.5 mr-1" />Update Trigger</>
            ) : (
              <><Plus className="size-3.5 mr-1" />Add Trigger</>
            )}
          </Button>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(triggers)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
