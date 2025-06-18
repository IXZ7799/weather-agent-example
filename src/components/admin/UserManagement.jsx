
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import DeleteUserDialog from './DeleteUserDialog';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log('Attempting to call list_users function...');
      // Call the list_users SQL function we created to get all users with their roles
      const { data: usersData, error: usersError } = await supabase
        .rpc('list_users');
      
      console.log('Response from list_users:', { data: usersData, error: usersError });
        
      if (usersError) {
        console.error('Error loading users:', usersError);
        throw usersError;
      }
      
      console.log('Users loaded:', usersData?.length || 0);
      
      // If no users found, show a message
      if (!usersData || usersData.length === 0) {
        toast.warning('No users found. This may be a permissions issue.');
        setUsers([]);
        return;
      }

      // Format the user data for display
      const formattedUsers = usersData.map(user => ({
        id: user.id,
        user_id: user.id,
        email: user.email || 'Email not available',
        full_name: user.full_name || 'Name not available',
        // Display 'user' in the UI but store the actual role value
        display_role: user.role === 'admin' ? 'admin' : 'user',
        role: user.role,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }));

      console.log('Formatted user data:', formattedUsers);
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      console.log('Updating user role...', { userId, newRole });
      
      if (newRole === 'admin') {
        // Add admin role to user_roles table
        const { error: insertError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'admin'
          });
        
        if (insertError) {
          console.error('Error adding admin role:', insertError);
          throw insertError;
        }
      } else {
        // Remove admin role from user_roles table
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        
        if (deleteError) {
          console.error('Error removing admin role:', deleteError);
          throw deleteError;
        }
      }
      
      toast.success(`User role updated to ${newRole}`);
      loadUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const [existingUsers, setExistingUsers] = useState([]);
  const [selectedExistingUser, setSelectedExistingUser] = useState('');

  // Load existing users for the dropdown
  useEffect(() => {
    if (showAddUser) {
      loadExistingUsers();
    }
  }, [showAddUser]);

  const loadExistingUsers = async () => {
    try {
      // Get all users that aren't already admins
      const { data, error } = await supabase.rpc('list_users');
      
      if (error) throw error;
      
      // Filter out users that already have admin role
      const nonAdminUsers = data.filter(user => user.role !== 'admin');
      setExistingUsers(nonAdminUsers);
    } catch (error) {
      console.error('Error loading existing users:', error);
      toast.error('Failed to load existing users');
    }
  };

  const addNewUser = async () => {
    if (!selectedExistingUser) {
      toast.error('Please select a user');
      return;
    }

    try {
      // Update the selected user to admin role
      await updateUserRole(selectedExistingUser, 'admin');
      setSelectedExistingUser('');
      setShowAddUser(false);
      toast.success('User has been granted admin privileges');
    } catch (error) {
      console.error('Error adding admin user:', error);
      toast.error('Failed to add admin user');
    }
  };

  // User click handler removed - no stats to show

  const handleUserDeleted = () => {
    loadUsers(); // Refresh the user list after deletion
  };

  return (
    <div className="bg-[#064646] border border-[#0fcabb] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">User Management</h2>
      </div>

      {showAddUser && (
        <div className="mb-6 p-4 bg-[#022222] border border-[#0fcabb]/30 rounded">
          <div className="flex gap-3">
            <select
              value={selectedExistingUser}
              onChange={(e) => setSelectedExistingUser(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#064646] border border-[#0fcabb]/30 rounded text-[#72f0df]"
            >
              <option value="">Select a user to make admin</option>
              {existingUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
            <Button
              onClick={() => {
                setShowAddUser(false);
                setSelectedExistingUser('');
              }}
              variant="outline"
              className="text-[#72f0df] border-[#0fcabb] hover:bg-[#064646]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {users.map((userRole) => (
          <div
            key={userRole.id}
            className={`flex items-center justify-between p-3 bg-[#022222] border border-[#0fcabb]/30 rounded ${currentUser && userRole.user_id === currentUser.id ? 'opacity-90' : 'hover:bg-[#064646]/50 cursor-pointer'} transition-colors`}
            onClick={() => {
              // Prevent selecting yourself
              if (currentUser && userRole.user_id === currentUser.id) {
                toast.dismiss();
                toast.info("You cannot select your own account for actions", {
                
                  style: {
                    background: '#022222',
                    color: '#72f0df',
                    border: '1px solid #0fcabb',
                    fontFamily: 'monospace',
                    borderRadius: '4px',
                    padding: '12px'
                  },
                  icon: '⚠️',
                  autoClose: 2
                });
                return;
              }
              setSelectedUser(userRole);
            }}
          >
            <div className="flex items-center gap-3">
              <User size={20} className="text-[#72f0df]" />
              <div>
                <div className="font-medium">
                  {userRole.full_name === 'Name not available' ? (
                    <span className="text-[#a0dad3] italic">Name not available</span>
                  ) : (
                    userRole.full_name
                  )}
                </div>
                <div className="text-sm text-[#a0dad3]">
                  {userRole.email === 'Email not available' ? (
                    <span className="italic">Email not available</span>
                  ) : (
                    userRole.email
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <Select
                value={userRole.display_role}
                onValueChange={(value) => updateUserRole(userRole.user_id, value)}
                disabled={currentUser && userRole.user_id === currentUser.id}
              >
                <SelectTrigger 
                  className={`w-32 bg-[#064646] border-[#0fcabb] ${currentUser && userRole.user_id === currentUser.id ? 'text-[#72f0df]/50 cursor-not-allowed' : 'text-[#72f0df]'} hover:bg-[#064646]/80`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#064646] border-[#0fcabb] text-[#72f0df]">
                  <SelectItem 
                    value="user" 
                    className="hover:bg-[#0fcabb]/20 focus:bg-[#0fcabb]/20 hover:text-[#72f0df] focus:text-[#72f0df]"
                  >
                    user
                  </SelectItem>
                  <SelectItem 
                    value="admin" 
                    className="hover:bg-[#0fcabb]/20 focus:bg-[#0fcabb]/20 hover:text-[#72f0df] focus:text-[#72f0df]"
                  >
                    admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {/* User stats modal removed */}
      <div className="mt-4">
        <h3 className="text-lg font-medium mb-3">User Actions</h3>
        <p className="text-sm text-[#a0dad3] mb-2">To delete a user, select them from the list above and click the button below.</p>
        {selectedUser && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span className="text-[#72f0df]">{selectedUser.full_name || selectedUser.email}</span>
            </div>
            <DeleteUserDialog user={selectedUser} onUserDeleted={handleUserDeleted} />
            <Button 
              variant="ghost"
              size="sm"
              className="text-[#72f0df] hover:bg-[#064646] border border-[#0fcabb]"
              onClick={() => setSelectedUser(null)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
