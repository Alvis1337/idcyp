import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  PersonRemove as RemoveIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface Group {
  id: number;
  name: string;
  invite_code: string;
  role: string;
  member_count: number;
  created_at: string;
}

interface Member {
  id: number;
  name: string;
  email: string;
  avatar_url: string;
  role: string;
  joined_at: string;
}

const GroupSettings = () => {
  const { user, login } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const [groupsRes, activeRes] = await Promise.all([
        fetch('/api/groups', { credentials: 'include' }),
        fetch('/api/groups/active', { credentials: 'include' }),
      ]);
      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (activeRes.ok) {
        const active = await activeRes.json();
        setActiveGroupId(active?.id || null);
      }
    } catch {
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = async (groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, { credentials: 'include' });
      if (res.ok) setMembers(await res.json());
    } catch {
      console.error('Failed to fetch members');
    }
  };

  useEffect(() => {
    if (user) fetchGroups();
  }, [user, fetchGroups]);

  useEffect(() => {
    if (selectedGroup) fetchMembers(selectedGroup.id);
  }, [selectedGroup]);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create group');
      setCreateOpen(false);
      setNewGroupName('');
      setSuccess('Group created!');
      fetchGroups();
    } catch {
      setError('Failed to create group');
    }
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await fetch(`/api/groups/join/${joinCode.trim()}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join group');
      setJoinCode('');
      setSuccess(`Joined "${data.group.name}"!`);
      fetchGroups();
    } catch (err: any) {
      setError(err.message || 'Invalid invite code');
    }
  };

  const switchGroup = async (groupId: number) => {
    try {
      const res = await fetch('/api/groups/active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) throw new Error('Failed to switch group');
      setActiveGroupId(groupId);
      setSuccess('Switched active group! Refresh to see the new menu.');
    } catch {
      setError('Failed to switch group');
    }
  };

  const removeMember = async (groupId: number, memberId: number) => {
    try {
      await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchMembers(groupId);
      fetchGroups();
    } catch {
      setError('Failed to remove member');
    }
  };

  const regenerateInvite = async (groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedGroup((prev) => prev ? { ...prev, invite_code: data.invite_code } : null);
      setSuccess('New invite code generated');
    } catch {
      setError('Failed to generate invite code');
    }
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Groups</Typography>
        <Typography color="text.secondary" paragraph>Log in to manage your groups.</Typography>
        <Button variant="contained" onClick={login}>Login with Google</Button>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Groups</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Group
        </Button>
      </Box>

      {/* Join group */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Join a Group</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Paste invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinGroup()}
            />
            <Button variant="outlined" onClick={joinGroup}>Join</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Group list */}
      <Stack spacing={2}>
        {groups.map((group) => (
          <Card
            key={group.id}
            sx={{
              cursor: 'pointer',
              border: activeGroupId === group.id ? 2 : 0,
              borderColor: 'primary.main',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => setSelectedGroup(group)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">
                    {group.name}
                    {activeGroupId === group.id && (
                      <Chip label="Active" color="primary" size="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {group.member_count} member{group.member_count !== 1 ? 's' : ''} · {group.role}
                  </Typography>
                </Box>
                {activeGroupId !== group.id && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={(e) => { e.stopPropagation(); switchGroup(group.id); }}
                  >
                    Switch
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Group detail dialog */}
      <Dialog open={!!selectedGroup} onClose={() => setSelectedGroup(null)} maxWidth="sm" fullWidth>
        {selectedGroup && (
          <>
            <DialogTitle>{selectedGroup.name}</DialogTitle>
            <DialogContent>
              {/* Invite section */}
              {selectedGroup.role === 'owner' && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Invite Link
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={`${window.location.origin}/join/${selectedGroup.invite_code}`}
                      slotProps={{ input: { readOnly: true } }}
                    />
                    <IconButton onClick={() => copyInviteLink(selectedGroup.invite_code)} color={copied ? 'success' : 'default'}>
                      {copied ? <CheckIcon /> : <CopyIcon />}
                    </IconButton>
                    <IconButton onClick={() => regenerateInvite(selectedGroup.id)}>
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Members
              </Typography>
              <List>
                {members.map((member) => (
                  <ListItem
                    key={member.id}
                    secondaryAction={
                      selectedGroup.role === 'owner' && member.id !== user?.id ? (
                        <IconButton edge="end" color="error" onClick={() => removeMember(selectedGroup.id, member.id)}>
                          <RemoveIcon />
                        </IconButton>
                      ) : null
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={member.avatar_url}>{member.name?.[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.name}
                      secondary={
                        <>
                          {member.email}
                          {member.role === 'owner' && (
                            <Chip label="Owner" size="small" sx={{ ml: 1 }} />
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedGroup(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create group dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createGroup()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createGroup}>Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GroupSettings;
