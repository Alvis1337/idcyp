import { 
  AppBar, Toolbar, Typography, Button, Box, IconButton, Avatar, Menu, MenuItem, 
  useMediaQuery, useTheme as useMuiTheme 
} from '@mui/material';
import { 
  Restaurant as RestaurantIcon, 
  Brightness4 as DarkIcon, 
  Brightness7 as LightIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useThemeMode } from '../theme/ThemeProvider';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const { mode, toggleTheme } = useThemeMode();
  const { user, login, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleClose();
  };

  return (
    <AppBar position="sticky" elevation={2}>
      <Toolbar>
        <RestaurantIcon sx={{ mr: 2 }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 700 }} 
          onClick={() => navigate('/')}
        >
          {isMobile ? 'Menu' : 'Our Menu Collection'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton color="inherit" onClick={toggleTheme} title={`Theme: ${mode}`}>
            {muiTheme.palette.mode === 'dark' ? <LightIcon /> : <DarkIcon />}
          </IconButton>

          {!isMobile && (
            <>
              <Button color="inherit" onClick={() => navigate('/')}>
                Menu
              </Button>
              <Button color="inherit" onClick={() => navigate('/planner')}>
                Planner
              </Button>
              <Button color="inherit" onClick={() => navigate('/add')}>
                Add Item
              </Button>
              <Button color="inherit" onClick={() => navigate('/shopping')}>
                Shopping
              </Button>
              <Button color="inherit" onClick={() => navigate('/groups')}>
                Groups
              </Button>
            </>
          )}

          {user ? (
            <>
              <IconButton onClick={handleMenu} sx={{ p: 0, ml: 1 }}>
                <Avatar 
                  src={user.avatar_url} 
                  alt={user.name}
                  sx={{ width: 32, height: 32 }}
                >
                  {user.name?.[0]}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem disabled>
                  <Typography variant="body2">{user.email}</Typography>
                </MenuItem>
                <MenuItem onClick={() => { handleClose(); navigate('/groups'); }}>Groups</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={login} variant="outlined" size="small">
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
