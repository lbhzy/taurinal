import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import type { QuickCommand } from "@/lib/quick-commands";

interface QuickCommandBarProps {
  commands: QuickCommand[];
  onSend: (command: string) => void;
  onManage: () => void;
}

export function QuickCommandBar({
  commands,
  onSend,
  onManage,
}: QuickCommandBarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border shrink-0">
        <span className="text-xs text-muted-foreground">
          {commands.length} commands
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground"
          onClick={onManage}
          title="Manage quick commands"
        >
          <Settings className="size-3" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2 scrollbar-thin">
        {commands.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No quick commands. Click the gear icon to add some.
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {commands.map((cmd) => (
              <Button
                key={cmd.id}
                variant="secondary"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => onSend(cmd.command)}
                title={cmd.command.replace(/\n$/, "")}
              >
                {cmd.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
