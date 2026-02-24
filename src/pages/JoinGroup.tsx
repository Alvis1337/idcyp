import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, CircularProgress, Alert, Button, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const JoinGroup = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (!user || !code) return;

    const join = async () => {
      try {
        const res = await fetch(`/api/groups/join/${code}`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus('error');
          setMessage(data.error || 'Failed to join group');
          return;
        }
        setStatus('success');
        setGroupName(data.group.name);
        setMessage(data.message);
      } catch {
        setStatus('error');
        setMessage('Failed to join group');
      }
    };
    join();
  }, [user, code]);

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Join Group</Typography>
        <Typography color="text.secondary" paragraph>Log in to join this group.</Typography>
        <Button variant="contained" onClick={login}>Login with Google</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      {status === 'loading' && <CircularProgress />}
      {status === 'error' && (
        <>
          <Alert severity="error" sx={{ mb: 2 }}>{message}</Alert>
          <Button variant="outlined" onClick={() => navigate('/')}>Go Home</Button>
        </>
      )}
      {status === 'success' && (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            {message === 'Already a member' ? `You're already a member of "${groupName}"` : `Joined "${groupName}"!`}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/groups')} sx={{ mr: 1 }}>
            Go to Groups
          </Button>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Go to Menu
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default JoinGroup;
