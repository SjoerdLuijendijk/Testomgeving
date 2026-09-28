"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  /** Styles the confirm button as destructive and focuses "Annuleren" first. */
  danger?: boolean;
};

type DialogRequest =
  | ({ kind: "confirm"; resolve: (confirmed: boolean) => void } & ConfirmOptions)
  | { kind: "notice"; title: string; message: string; resolve: (confirmed: boolean) => void };

type DialogApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (message: string, title?: string) => Promise<void>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog() {
  const api = useContext(DialogContext);
  if (!api) throw new Error("useDialog must be used inside DialogProvider");
  return api;
}

// App-wide styled replacement for window.confirm and window.alert.
export default function DialogProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [request, setRequest] = useState<DialogRequest | null>(null);

  useEffect(() => {
    if (request && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [request]);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ kind: "confirm", ...options, resolve })),
    [],
  );
  const notify = useCallback(
    (message: string, title = "Er ging iets mis") =>
      new Promise<void>((resolve) => setRequest({ kind: "notice", title, message, resolve: () => resolve() })),
    [],
  );

  function answer(confirmed: boolean) {
    request?.resolve(confirmed);
    setRequest(null);
    dialogRef.current?.close();
  }

  return (
    <DialogContext.Provider value={{ confirm, notify }}>
      {children}
      <dialog
        ref={dialogRef}
        className="app-dialog"
        aria-labelledby="app-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          answer(false);
        }}
      >
        {request && (
          <>
            <h2 id="app-dialog-title">{request.title}</h2>
            {request.message && <p>{request.message}</p>}
            <div className="button-row dialog-actions">
              {request.kind === "confirm" ? (
                <>
                  <button type="button" className="secondary-button" onClick={() => answer(false)} autoFocus={request.danger}>
                    Annuleren
                  </button>
                  <button
                    type="button"
                    className={request.danger ? "primary-button danger-button" : "primary-button"}
                    onClick={() => answer(true)}
                    autoFocus={!request.danger}
                  >
                    {request.confirmLabel}
                  </button>
                </>
              ) : (
                <button type="button" className="primary-button" onClick={() => answer(true)} autoFocus>
                  Oké
                </button>
              )}
            </div>
          </>
        )}
      </dialog>
    </DialogContext.Provider>
  );
}
