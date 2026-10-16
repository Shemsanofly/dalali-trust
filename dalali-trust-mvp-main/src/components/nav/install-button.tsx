"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install the app" — shown only when the browser offers installation (Chrome / Edge /
 * Samsung Internet on Android) and the site is not already installed.
 */
export function InstallButton({ label, className = "btn-ghost" }: { label: string; className?: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own button instead of the browser's mini bar
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice.catch(() => undefined);
        setPrompt(null);
      }}
    >
      <Download className="h-4 w-4" aria-hidden /> {label}
    </button>
  );
}
