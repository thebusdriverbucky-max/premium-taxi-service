// components/ui/Dialog.tsx

"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  extraAction?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  isLoading = false,
  extraAction,
  size = "md",
}: DialogProps) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      // Закрываем ТОЛЬКО если onConfirm не бросил исключение
      onOpenChange(false);
    } catch (error) {
      // Ошибку пробрасываем наверх, окно НЕ закрывается
      // Родительский компонент сам обработает через toast/alert
      console.error("Dialog confirm error:", error);
      throw error;
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} size={size as any}>
      <div className="space-y-4">
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
        {children}
        {(confirmText || cancelText) && (
          <div className="flex gap-3 justify-end pt-6 border-t border-white/10">
            {extraAction && <div className="mr-auto">{extraAction}</div>}
            {cancelText && (
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isLoading}
                className="bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
              >
                {cancelText}
              </Button>
            )}
            {confirmText && (
              <Button
                variant={isDangerous ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={isLoading}
                className={cn(
                  !isDangerous && "bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none shadow-lg shadow-taxi-gold/20"
                )}
              >
                {isLoading ? "Loading..." : confirmText}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export { Dialog };
