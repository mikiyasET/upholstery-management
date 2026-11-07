import * as React from "react"
import { createPortal } from "react-dom"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { useTranslation } from "react-i18next"
import { AlertTriangle, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface DialogContextType {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  markDirty: () => void;
  resetDirty: () => void;
  registerContentNode: (node: HTMLElement | null) => void;
  requestClose: () => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

export function useDialogDirty() {
  const ctx = React.useContext(DialogContext);
  return ctx || {
    isDirty: false,
    setIsDirty: () => {},
    markDirty: () => {},
    resetDirty: () => {},
    registerContentNode: () => {},
    requestClose: () => {},
  };
}

function getFormSnapshot(container: HTMLElement | null): string {
  if (!container) return "";
  const elements = container.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input, textarea, select");
  const values: string[] = [];
  elements.forEach((el) => {
    if (el.type === "button" || el.type === "submit" || el.hasAttribute("data-ignore-dirty")) {
      return;
    }
    const key = el.name || el.id || el.getAttribute("placeholder") || "field";
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      values.push(`${key}:${el.checked}`);
    } else {
      values.push(`${key}:${el.value}`);
    }
  });
  return values.join("||");
}

function DiscardChangesConfirmationModal({
  isOpen,
  onKeepEditing,
  onDiscard,
}: {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onKeepEditing();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onKeepEditing]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onKeepEditing}
      />

      {/* Confirmation Card */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-desc"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="unsaved-changes-title"
              className="text-base font-bold text-foreground leading-tight"
            >
              {t("common.unsavedChangesTitle", "Unsaved Changes")}
            </h3>
            <p
              id="unsaved-changes-desc"
              className="text-xs text-muted-foreground mt-1.5 leading-relaxed"
            >
              {t(
                "common.unsavedChangesMessage",
                "You have unsaved changes in this form. If you close now, your changes will be discarded. Are you sure you want to close?"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={onKeepEditing}
            className="h-9 px-3.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold tracking-wide transition-all cursor-pointer active:scale-[0.98]"
          >
            {t("common.keepEditing", "Keep Editing")}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold tracking-wide transition-all shadow-sm shadow-amber-600/30 cursor-pointer active:scale-[0.98]"
          >
            {t("common.discardChanges", "Discard Changes")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export interface DialogProps extends DialogPrimitive.Root.Props {
  /** Explicit override for unsaved changes detection */
  hasUnsavedChanges?: boolean;
  /** Whether to bypass unsaved changes warning (default: false) */
  disableUnsavedConfirmation?: boolean;
}

function Dialog({
  hasUnsavedChanges,
  disableUnsavedConfirmation = false,
  onOpenChange,
  open,
  children,
  ...props
}: DialogProps) {
  const [isDirtyState, setIsDirtyState] = React.useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);

  const isDirtyRef = React.useRef(false);
  const contentNodeRef = React.useRef<HTMLElement | null>(null);
  const initialSnapshotRef = React.useRef<string | null>(null);

  // Reset dirty states whenever dialog opens or closes
  React.useEffect(() => {
    if (open) {
      isDirtyRef.current = false;
      setIsDirtyState(false);
      setShowDiscardConfirm(false);

      // Snapshot after 150ms to allow React forms to populate from props / state
      const timer = setTimeout(() => {
        if (contentNodeRef.current) {
          initialSnapshotRef.current = getFormSnapshot(contentNodeRef.current);
        }
      }, 150);

      return () => clearTimeout(timer);
    } else {
      isDirtyRef.current = false;
      setIsDirtyState(false);
      initialSnapshotRef.current = null;
      setShowDiscardConfirm(false);
    }
  }, [open]);

  const markDirty = React.useCallback(() => {
    isDirtyRef.current = true;
    setIsDirtyState(true);
  }, []);

  const resetDirty = React.useCallback(() => {
    isDirtyRef.current = false;
    setIsDirtyState(false);
    if (contentNodeRef.current) {
      initialSnapshotRef.current = getFormSnapshot(contentNodeRef.current);
    }
  }, []);

  const setIsDirty = React.useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty;
    setIsDirtyState(dirty);
  }, []);

  const registerContentNode = React.useCallback((node: HTMLElement | null) => {
    contentNodeRef.current = node;
    if (node && open && initialSnapshotRef.current === null) {
      setTimeout(() => {
        initialSnapshotRef.current = getFormSnapshot(node);
      }, 100);
    }
  }, [open]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean, eventDetails: any) => {
      if (!nextOpen) {
        let hasChanges = false;

        if (hasUnsavedChanges !== undefined) {
          hasChanges = hasUnsavedChanges;
        } else {
          const currentSnapshot = getFormSnapshot(contentNodeRef.current);
          const snapshotChanged =
            initialSnapshotRef.current !== null &&
            currentSnapshot !== "" &&
            initialSnapshotRef.current !== currentSnapshot;

          hasChanges = isDirtyRef.current || snapshotChanged;
        }

        if (!disableUnsavedConfirmation && hasChanges) {
          setShowDiscardConfirm(true);
          return;
        }
      }

      isDirtyRef.current = false;
      setIsDirtyState(false);
      setShowDiscardConfirm(false);
      onOpenChange?.(nextOpen, eventDetails);
    },
    [hasUnsavedChanges, disableUnsavedConfirmation, onOpenChange]
  );

  const requestClose = React.useCallback(() => {
    handleOpenChange(false, { reason: "outside-press" });
  }, [handleOpenChange]);

  const handleDiscard = React.useCallback(() => {
    setShowDiscardConfirm(false);
    isDirtyRef.current = false;
    setIsDirtyState(false);
    onOpenChange?.(false, { reason: "outside-press" } as any);
  }, [onOpenChange]);

  const handleKeepEditing = React.useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  const contextValue = React.useMemo<DialogContextType>(() => ({
    isDirty: isDirtyState,
    setIsDirty,
    markDirty,
    resetDirty,
    registerContentNode,
    requestClose,
  }), [isDirtyState, setIsDirty, markDirty, resetDirty, registerContentNode, requestClose]);

  return (
    <DialogContext.Provider value={contextValue}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
      <DiscardChangesConfirmationModal
        isOpen={showDiscardConfirm}
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </DialogContext.Provider>
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-[250] bg-black/60 duration-100 backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const dialogContext = React.useContext(DialogContext);
  const popupRef = React.useRef<HTMLDivElement | null>(null);

  const handleRef = React.useCallback((node: HTMLDivElement | null) => {
    popupRef.current = node;
    dialogContext?.registerContentNode(node);
  }, [dialogContext]);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={handleRef}
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-[250] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        onInputCapture={(e) => {
          dialogContext?.markDirty();
          props.onInputCapture?.(e);
        }}
        onChangeCapture={(e) => {
          dialogContext?.markDirty();
          props.onChangeCapture?.(e);
        }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
