"use client";

import { useState } from "react";

export function CopyPasscode({ passcode, slug }: { passcode: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);
  function copy() {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/ops/client/login?slug=${encodeURIComponent(slug)}&pre=1`;
    const msg = `Hi! Your Giraffe Wallet sign-in:\nLink: ${link}\nCode: ${slug}\nPasscode: ${passcode}`;
    navigator.clipboard.writeText(msg).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2">
      <span className="mono text-sm">{reveal ? passcode : "••••"}</span>
      <button type="button" className="btn btn-ghost text-xs px-2 py-1" onClick={() => setReveal((s) => !s)}>{reveal ? "Hide" : "Reveal"}</button>
      <button type="button" className="btn btn-ghost text-xs px-2 py-1" onClick={copy}>{copied ? "Copied" : "Copy WhatsApp message"}</button>
    </div>
  );
}
