import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import MenuList from './pages/MenuList';
import AddMenuItem from './pages/AddMenuItem';
import MenuItemDetail from './pages/MenuItemDetail';
import MealPlanner from './pages/MealPlanner';
import ShoppingList from './pages/ShoppingList';
import SharedMenuItem from './pages/SharedMenuItem';
import BottomNav from './components/BottomNav';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Box sx={{ minHeight: '100vh', pb: { xs: 8, md: 0 } }}>
            <Header />
            <Routes>
              <Route path="/" element={<MenuList />} />
              <Route path="/add" element={<AddMenuItem />} />
              <Route path="/menu/:id" element={<MenuItemDetail />} />
              <Route path="/planner" element={<MealPlanner />} />
              <Route path="/shopping" element={<ShoppingList />} />
              <Route path="/shared/:token" element={<SharedMenuItem />} />
            </Routes>
            <BottomNav />
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
