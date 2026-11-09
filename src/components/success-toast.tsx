"use client";

import { ToastNotification } from "@carbon/react";

interface SuccessToastProps {
  message: string;
  onClose: () => void;
}

export function SuccessToast({ message, onClose }: SuccessToastProps) {
  return (
    <ToastNotification
      className="app-success-toast"
      kind="success"
      title="Success"
      subtitle={message}
      timeout={5000}
      onCloseButtonClick={onClose}
    />
  );
}
