import React from "react";
import { AlertTriangle, Info, XCircle, CheckCircle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { cn } from "../../utils/cn";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  icon: CustomIcon,
}) => {
  const icons = {
    danger: <XCircle size={32} className="text-red-500" />,
    warning: <AlertTriangle size={32} className="text-amber-500" />,
    info: <Info size={32} className="text-indigo-500" />,
    success: <CheckCircle size={32} className="text-emerald-500" />,
  };

  const bgColors = {
    danger: "bg-red-50 text-red-500",
    warning: "bg-amber-50 text-amber-500",
    info: "bg-indigo-50 text-indigo-500",
    success: "bg-emerald-50 text-emerald-500",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-center py-4 space-y-4">
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
            bgColors[variant],
          )}
        >
          {CustomIcon ? <CustomIcon size={32} /> : icons[variant]}
        </div>
        <p className="text-gray-500 font-medium leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
