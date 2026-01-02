import { useState, useEffect } from 'react';
import { Header } from '../components/organisms/Header';
import { Button } from '../components/atoms/Button';
import { Spinner } from '../components/atoms/Spinner';
import { Modal } from '../components/atoms/Modal';
import { Plus, Mail, MoreVertical, Shield, User as UserIcon, Trash2, Ban, Check } from 'lucide-react';
import { toast } from '../stores/toastStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'member';
  status: 'pending' | 'active' | 'suspended';
  avatarUrl: string | null;
  authProvider: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  expiresAt: string;
  createdAt: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, invitesRes] = await Promise.all([
        fetch(`${API_BASE}/users`, { headers }),
        fetch(`${API_BASE}/users/invitations`, { headers }),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data);
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvitations(invitesData.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateUserRole = async (userId: string, role: 'admin' | 'member') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update user');
      }

      toast.success('User updated', `Role changed to ${role}`);
      fetchData();
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Unknown error');
    }
    setActionMenuOpen(null);
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update user');
      }

      toast.success('User updated', `Status changed to ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Unknown error');
    }
    setActionMenuOpen(null);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete user');
      }

      toast.success('User deleted', 'The user has been removed');
      fetchData();
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    }
    setActionMenuOpen(null);
  };

  const cancelInvitation = async (inviteId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/users/invitations/${inviteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to cancel invitation');
      }

      toast.success('Invitation cancelled', 'The invitation has been revoked');
      fetchData();
    } catch (err) {
      toast.error('Cancel failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-toucan-grey-100">Users</h1>
            <p className="text-toucan-grey-400 mt-1">
              Manage team members and invitations
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowInviteModal(true)}
            leftIcon={<Plus size={16} />}
          >
            Invite User
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-toucan-dark-lighter rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-toucan-dark text-toucan-grey-100'
                : 'text-toucan-grey-400 hover:text-toucan-grey-200'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'invitations'
                ? 'bg-toucan-dark text-toucan-grey-100'
                : 'text-toucan-grey-400 hover:text-toucan-grey-200'
            }`}
          >
            Pending Invites ({invitations.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : activeTab === 'users' ? (
          /* Users Table */
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-toucan-dark-lighter">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-toucan-grey-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-toucan-grey-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-toucan-grey-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-toucan-grey-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-toucan-grey-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toucan-dark-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-toucan-dark-lighter/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-toucan-dark-lighter flex items-center justify-center">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                          ) : (
                            <UserIcon size={20} className="text-toucan-grey-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-toucan-grey-100">
                            {user.name || 'No name'}
                            {user.id === currentUser.id && (
                              <span className="ml-2 text-xs text-toucan-grey-500">(you)</span>
                            )}
                          </div>
                          <div className="text-sm text-toucan-grey-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-toucan-orange/20 text-toucan-orange'
                            : 'bg-toucan-dark-lighter text-toucan-grey-300'
                        }`}
                      >
                        {user.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-toucan-success/20 text-toucan-success'
                            : user.status === 'suspended'
                            ? 'bg-toucan-error/20 text-toucan-error'
                            : 'bg-toucan-warning/20 text-toucan-warning'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-toucan-grey-400">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {user.id !== currentUser.id && (
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                            className="p-2 text-toucan-grey-400 hover:text-toucan-grey-200 rounded-md hover:bg-toucan-dark-lighter"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {actionMenuOpen === user.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg shadow-lg z-10">
                              <div className="py-1">
                                <button
                                  onClick={() =>
                                    updateUserRole(user.id, user.role === 'admin' ? 'member' : 'admin')
                                  }
                                  className="w-full px-4 py-2 text-left text-sm text-toucan-grey-200 hover:bg-toucan-dark flex items-center gap-2"
                                >
                                  <Shield size={14} />
                                  {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                </button>
                                <button
                                  onClick={() =>
                                    updateUserStatus(
                                      user.id,
                                      user.status === 'suspended' ? 'active' : 'suspended'
                                    )
                                  }
                                  className="w-full px-4 py-2 text-left text-sm text-toucan-grey-200 hover:bg-toucan-dark flex items-center gap-2"
                                >
                                  {user.status === 'suspended' ? (
                                    <>
                                      <Check size={14} />
                                      Activate
                                    </>
                                  ) : (
                                    <>
                                      <Ban size={14} />
                                      Suspend
                                    </>
                                  )}
                                </button>
                                <hr className="my-1 border-toucan-dark-border" />
                                <button
                                  onClick={() => deleteUser(user.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-toucan-error hover:bg-toucan-dark flex items-center gap-2"
                                >
                                  <Trash2 size={14} />
                                  Delete User
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Invitations List */
          <div className="space-y-4">
            {invitations.length === 0 ? (
              <div className="card p-8 text-center">
                <Mail className="w-12 h-12 mx-auto text-toucan-grey-600 mb-4" />
                <h3 className="text-lg font-medium text-toucan-grey-200 mb-2">No pending invitations</h3>
                <p className="text-toucan-grey-400">
                  Invite team members to get started
                </p>
              </div>
            ) : (
              invitations.map((invite) => (
                <div key={invite.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-toucan-dark flex items-center justify-center">
                      <Mail size={20} className="text-toucan-grey-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-toucan-grey-100">{invite.email}</div>
                      <div className="text-xs text-toucan-grey-400">
                        Invited by {invite.invitedBy.name || invite.invitedBy.email} as {invite.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-toucan-grey-500">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => cancelInvitation(invite.id)}
                      className="text-toucan-error hover:text-red-400 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setShowInviteModal(false);
          fetchData();
        }}
      />
    </div>
  );
}

// Invite User Modal Component
function InviteUserModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send invitation');
      }

      toast.success('Invitation sent', `An invitation has been sent to ${email}`);
      setEmail('');
      setRole('member');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite User">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-toucan-error/20 border border-toucan-error text-toucan-error px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
            placeholder="colleague@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
            Role
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="member"
                checked={role === 'member'}
                onChange={() => setRole('member')}
                className="text-toucan-orange focus:ring-toucan-orange"
              />
              <span className="text-sm text-toucan-grey-200">Member</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === 'admin'}
                onChange={() => setRole('admin')}
                className="text-toucan-orange focus:ring-toucan-orange"
              />
              <span className="text-sm text-toucan-grey-200">Admin</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
