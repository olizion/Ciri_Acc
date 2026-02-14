"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2Icon } from "lucide-react";

// ============================================================================
// DeleteConfirmDialog
// ============================================================================

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleName: string;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  ruleName,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slett regel</AlertDialogTitle>
          <AlertDialogDescription>
            Er du sikker pa at du vil slette regelen &quot;{ruleName}&quot;?
            Denne handlingen kan ikke angres.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting && (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            )}
            Slett
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
