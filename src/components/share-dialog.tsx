"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Share2,
  Copy,
  Check,
  Code2,
  Mail,
} from "lucide-react";

interface ShareDialogProps {
  url?: string;
  title?: string;
  trigger?: React.ReactNode;
}

export function ShareDialog({ url, title, trigger }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareTitle = title || "Check out this video on NepTube";

  const embedCode = `<iframe width="560" height="315" src="${shareUrl.replace("/feed/", "/embed/").replace("/watch/yt/", "/embed/yt/")}" frameborder="0" allowfullscreen></iframe>`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareActions = [
    {
      label: "X (Twitter)",
      icon: () => <span className="text-sm font-bold">𝕏</span>,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    },
    {
      label: "Facebook",
      icon: () => <span className="text-sm font-bold text-blue-600">f</span>,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "WhatsApp",
      icon: () => <span className="text-sm">💬</span>,
      href: `https://wa.me/?text=${encodeURIComponent(shareTitle + " " + shareUrl)}`,
    },
    {
      label: "Email",
      icon: () => <Mail className="h-4 w-4" />,
      href: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Share
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy URL */}
          <div className="flex items-center gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1 text-sm bg-muted"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => handleCopy(shareUrl, "Link")}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {/* Social share buttons */}
          <div className="grid grid-cols-4 gap-2">
            {shareActions.map((action) => (
              <a
                key={action.label}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <action.icon />
                <span className="text-[10px] text-muted-foreground">{action.label}</span>
              </a>
            ))}
          </div>

          {/* Embed code */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground"
              onClick={() => setShowEmbed(!showEmbed)}
            >
              <Code2 className="h-3 w-3" />
              {showEmbed ? "Hide embed code" : "Get embed code"}
            </Button>
            {showEmbed && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={embedCode}
                  readOnly
                  className="w-full h-20 text-xs font-mono p-2 bg-muted rounded-md border resize-none"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => handleCopy(embedCode, "Embed code")}
                >
                  <Copy className="h-3 w-3" /> Copy embed code
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
