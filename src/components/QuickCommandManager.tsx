import { useState } from "react";
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
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { QuickCommand } from "@/lib/quick-commands";

interface QuickCommandManagerProps {
  open: boolean;
  commands: QuickCommand[];
  onSave: (commands: QuickCommand[]) => void;
  onCancel: () => void;
}

export function QuickCommandManager({
  open,
  commands: initialCommands,
  onSave,
  onCancel,
}: QuickCommandManagerProps) {
  const [commands, setCommands] = useState<QuickCommand[]>(initialCommands);
  const [editLabel, setEditLabel] = useState("");
  const [editCommand, setEditCommand] = useState("");

  const addCommand = () => {
    if (!editLabel.trim() || !editCommand.trim()) return;
    const cmd = editCommand.endsWith("\n") ? editCommand : editCommand + "\n";
    setCommands((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: editLabel.trim(), command: cmd },
    ]);
    setEditLabel("");
    setEditCommand("");
  };

  const removeCommand = (id: string) => {
    setCommands((prev) => prev.filter((c) => c.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCommand();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Quick Commands</DialogTitle>
          <DialogDescription>
            Add, remove, or reorder your quick command buttons.
          </DialogDescription>
        </DialogHeader>

        {/* Command list */}
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {commands.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No quick commands yet. Add one below.
            </p>
          )}
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 group"
            >
              <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{cmd.label}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {cmd.command.replace(/\n$/, "")}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive-foreground"
                onClick={() => removeCommand(cmd.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new command */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="cmd-label" className="text-xs">
                Button Label
              </Label>
              <Input
                id="cmd-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. deploy"
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-3 space-y-1">
              <Label htmlFor="cmd-command" className="text-xs">
                Command
              </Label>
              <div className="flex gap-1">
                <Input
                  id="cmd-command"
                  value={editCommand}
                  onChange={(e) => setEditCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. ./deploy.sh"
                  className="h-8 text-xs font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2 shrink-0"
                  onClick={addCommand}
                  disabled={!editLabel.trim() || !editCommand.trim()}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(commands)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
