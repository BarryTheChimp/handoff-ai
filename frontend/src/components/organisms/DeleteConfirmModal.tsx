import { AlertTriangle } from 'lucide-react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemName: string;
  itemType?: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  itemName,
  itemType = 'item',
}: DeleteConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${itemType}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isDeleting}
            className="bg-toucan-error hover:bg-toucan-error/80"
          >
            Delete
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-toucan-error/20 rounded-full shrink-0">
          <AlertTriangle size={20} className="text-toucan-error" />
        </div>
        <div>
          <p className="text-toucan-grey-100 mb-2">
            Are you sure you want to delete <strong>{itemName}</strong>?
          </p>
          <p className="text-sm text-toucan-grey-400">
            This action cannot be undone. All work items associated with this {itemType.toLowerCase()} will also be deleted.
          </p>
        </div>
      </div>
    </Modal>
  );
}
