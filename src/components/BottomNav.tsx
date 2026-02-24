import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme } from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getValueFromPath = (path: string) => {
    if (path === '/') return 0;
    if (path.startsWith('/planner')) return 1;
    if (path === '/add') return 2;
    if (path.startsWith('/shopping')) return 3;
    return 0;
  };

  const [value, setValue] = useState(getValueFromPath(location.pathname));

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/planner');
        break;
      case 2:
        navigate('/add');
        break;
      case 3:
        navigate('/shopping');
        break;
    }
  };

  if (!isMobile) return null;

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
      elevation={3}
    >
      <BottomNavigation value={value} onChange={handleChange} showLabels>
        <BottomNavigationAction label="Menu" icon={<RestaurantIcon />} />
        <BottomNavigationAction label="Planner" icon={<CalendarIcon />} />
        <BottomNavigationAction label="Add" icon={<AddIcon />} />
        <BottomNavigationAction label="Shopping" icon={<ShoppingCartIcon />} />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;
