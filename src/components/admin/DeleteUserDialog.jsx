
import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const DeleteUserDialog = ({ user, onUserDeleted }) => {
  const { user: currentUser, isAdmin } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to perform this action');
      return;
    }

    if (!isAdmin) {
      toast.error('You must be an admin to delete users');
      return;
    }

    // Prevent self-deletion
    if (user.user_id === currentUser.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    setDeleting(true);
    try {
      // Use rpc to bypass TypeScript error
      const { data, error } = await supabase.rpc('delete_user_and_data', {
        target_user_id: user.user_id
      });

      if (error) throw error;

      if (data) {
        toast.success('User deleted successfully');
        onUserDeleted?.();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white"
          disabled={deleting}
        >
          <Trash2 size={16} className="mr-2" />
          Delete User
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[#064646] border-[#0fcabb] text-[#72f0df]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-400">Delete User</AlertDialogTitle>
          <AlertDialogDescription className="text-[#a0dad3]">
            <div>
              Are you sure you want to delete this user? This action will permanently remove:
            </div>
            <div className="list-disc ml-6 mt-2 space-y-1">
              <div>• User profile and account data</div>
              <div>• All conversations and messages</div>
              <div>• All modules and code</div>
              <div>• User roles and permissions</div>
            </div>
            <div className="text-red-400 font-semibold mt-2">This action cannot be undone.</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-[#022222] border-[#0fcabb] text-[#72f0df] hover:bg-[#064646]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteUser}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? 'Deleting...' : 'Delete User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserDialog;
