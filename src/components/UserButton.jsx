import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LogOut, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';

const UserButton = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  if (!user) return null;
  
  const handleSignOut = () => {
    setShowSignOutConfirm(false);
    signOut();
  };

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Button
          onClick={() => navigate('/admin')}
          variant="ghost"
          size="sm"
          className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] transition-all"
        >
          <Shield size={16} className="mr-1" />
          Admin
        </Button>
      )}
      
      <div className="flex items-center gap-2 px-3 py-1 bg-[#064646] rounded">
        <User size={16} />
        <span className="text-sm">{user.email}</span>
      </div>
      
      <Button
        onClick={() => setShowSignOutConfirm(true)}
        variant="ghost"
        size="sm"
        className="text-[#72f0df] hover:bg-[#064646]"
      >
        <LogOut size={16} />
      </Button>
      
      <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <DialogContent className="bg-[#022222] border border-[#0fcabb] text-[#72f0df]">
          <DialogHeader>
            <DialogTitle className="text-[#0fcabb]">Sign Out Confirmation</DialogTitle>
            <DialogDescription className="text-[#a0dad3]">
              Are you sure you want to sign out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => setShowSignOutConfirm(false)}
              variant="ghost"
              size="sm"
              className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] border border-[#0fcabb] transition-all"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSignOut}
              variant="default"
              size="sm"
              className="bg-[#0fcabb] text-[#022222] hover:bg-[#72f0df] transition-all"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserButton;
