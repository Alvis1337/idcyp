import { useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Fab, Grid } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMenuItems } from '../store/menuSlice';
import MenuItemCard from '../components/MenuItemCard';
import { useNavigate } from 'react-router-dom';

const MenuList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useAppSelector((state) => state.menu);

  useEffect(() => {
    dispatch(fetchMenuItems());
  }, [dispatch]);

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" variant="h6" sx={{ mt: 4 }}>
          Error: {error}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        Our Menu
      </Typography>

      {Object.keys(groupedItems).length === 0 ? (
        <Typography variant="h6" align="center" color="text.secondary">
          No menu items yet. Add your first dish!
        </Typography>
      ) : (
        Object.entries(groupedItems).map(([category, categoryItems]) => (
          <Box key={category} sx={{ mb: 6 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
              {category}
            </Typography>
            <Grid container spacing={3}>
              {categoryItems.map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                  <MenuItemCard item={item} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/add')}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};

export default MenuList;
