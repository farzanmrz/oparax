"use client";

// Unsaved-changes guard. A tiny context/provider that lets the Profile form
// register "dirty" state and lets the sidebar (and any nav control) confirm
// before navigating away. The guard covers three escape routes:
//   • in-app nav / sign-out — callers gate on confirmLeave() before routing.
//   • reload / tab close / leaving the app — a beforeunload listener.
//   • browser Back — a sentinel history entry + popstate confirm (best-effort).
// dirtyRef mirrors the dirty state so the event handlers (which capture once)
// always read the latest value without re-subscribing.
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type UnsavedChangesValue = {
  setDirty: (next: boolean) => void;
  confirmLeave: () => boolean;
};

const UnsavedChangesContext = createContext<UnsavedChangesValue | null>(null);

const LEAVE_MESSAGE = "You have unsaved changes that will be lost. Leave without saving?";

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);

  // Mirror dirty into a ref so event handlers read the latest value.
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Synchronous confirm for in-app nav / sign-out. Returns true to proceed.
  const confirmLeave = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm(LEAVE_MESSAGE);
  }, []);

  // Native beforeunload (reload / tab close / leaving the app) while dirty.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers require returnValue to be set to show the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Browser Back (best-effort): while dirty, keep a sentinel entry on top of
  // history so a Back press fires popstate here first. On popstate we confirm;
  // if the user cancels we re-push the sentinel to keep them on the page. The
  // `ignoreNext` guard stops the programmatic re-push from re-triggering us.
  useEffect(() => {
    if (!dirty) return;
    let ignoreNext = false;

    // Push one sentinel so there's an extra entry to pop.
    window.history.pushState(
      {
        unsavedSentinel: true,
      },
      "",
    );

    const onPopState = () => {
      if (ignoreNext) {
        ignoreNext = false;
        return;
      }
      if (dirtyRef.current && !window.confirm(LEAVE_MESSAGE)) {
        // Cancel the back: re-push the sentinel (ignore the resulting popstate).
        ignoreNext = true;
        window.history.pushState(
          {
            unsavedSentinel: true,
          },
          "",
        );
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dirty]);

  return (
    <UnsavedChangesContext.Provider
      value={{
        setDirty,
        confirmLeave,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

/**
 * Access the unsaved-changes guard. Returns no-op defaults when no provider is
 * mounted, so consumers stay safe outside the dashboard layout.
 */
export function useUnsavedChanges(): UnsavedChangesValue {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    return {
      setDirty: () => {},
      confirmLeave: () => true,
    };
  }
  return ctx;
}
