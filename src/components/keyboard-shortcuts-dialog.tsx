"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const shortcuts = [
  { category: "Navigation", items: [
    { keys: ["/"], desc: "Focus search bar" },
    { keys: ["Ctrl", "K"], desc: "Open command palette" },
    { keys: ["?"], desc: "Show keyboard shortcuts" },
  ]},
  { category: "Video Player", items: [
    { keys: ["Space", "K"], desc: "Play / Pause" },
    { keys: ["F"], desc: "Toggle fullscreen" },
    { keys: ["M"], desc: "Toggle mute" },
    { keys: ["J"], desc: "Rewind 10 seconds" },
    { keys: ["L"], desc: "Forward 10 seconds" },
    { keys: ["←"], desc: "Rewind 5 seconds" },
    { keys: ["→"], desc: "Forward 5 seconds" },
    { keys: ["↑"], desc: "Increase volume" },
    { keys: ["↓"], desc: "Decrease volume" },
    { keys: ["T"], desc: "Toggle theater mode" },
    { keys: ["I"], desc: "Toggle mini player" },
    { keys: ["0-9"], desc: "Seek to 0%-90%" },
  ]},
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                {section.category}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((shortcut) => (
                  <div key={shortcut.desc} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
                    <span className="text-sm text-foreground">{shortcut.desc}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-xs text-muted-foreground mx-0.5">+</span>}
                          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-medium border border-border rounded bg-muted text-muted-foreground">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
