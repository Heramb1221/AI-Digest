"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ─── Context & hook ───────────────────────────────────────────────────────────

type ToastType = "default" | "success" | "error";

interface Toast {
  id:      string;
  title:   string;
  description?: string;
  type:    ToastType;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return React.useContext(ToastContext);
}

// ─── Provider + Toaster ───────────────────────────────────────────────────────

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((opts: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...opts, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider>
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              "fixed bottom-4 right-4 z-50 flex items-start gap-3 rounded-lg border px-4 py-3 shadow-panel",
              "bg-paper-raised text-ink animate-in",
              "w-[360px] max-w-[calc(100vw-32px)]",
              t.type === "success" && "border-green-200 bg-green-50",
              t.type === "error"   && "border-red-200   bg-red-50"
            )}
          >
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-medium">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-xs text-ink-muted mt-0.5">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="text-ink-faint hover:text-ink transition-colors mt-0.5">
              <X size={14} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
