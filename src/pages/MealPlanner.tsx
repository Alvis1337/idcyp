import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMealPlans, addMealPlan, deleteMealPlan } from '../store/mealPlanSlice';
import { fetchMenuItems } from '../store/menuSlice';
import { useAuth } from '../contexts/AuthContext';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const MealPlanner = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, login } = useAuth();
  const { plans } = useAppSelector((state) => state.mealPlan);
  const { items: menuItems } = useAppSelector((state) => state.menu);

  const [selectedDate, setSelectedDateLocal] = useState(new Date());
  // dialogDate tracks which day the "Add meal" dialog is targeting.
  // Kept separate from selectedDate so opening the dialog doesn't trigger
  // a re-fetch (which would race with and overwrite the newly added plan).
  const [dialogDate, setDialogDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    menu_item_id: 0,
    meal_type: 'dinner' as const,
    notes: '',
  });

  useEffect(() => {
    if (user) {
      const startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      dispatch(fetchMealPlans({
        startDate: toLocalDateString(startDate),
        endDate: toLocalDateString(endDate),
      }));

      dispatch(fetchMenuItems());
    }
  }, [dispatch, selectedDate, user]);

  const [shoppingListLoading, setShoppingListLoading] = useState(false);

  const handleGenerateShoppingList = async () => {
    setShoppingListLoading(true);
    try {
      const startDate = toLocalDateString(weekDays[0]);
      const endDate = toLocalDateString(weekDays[6]);
      const response = await fetch('/api/meals/plans/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!response.ok) throw new Error('Failed to generate shopping list');
      await response.json();
      navigate(`/shopping`);
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
      alert('Failed to generate shopping list.');
    } finally {
      setShoppingListLoading(false);
    }
  };

  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return day;
    });
  };

  const weekDays = getWeekDays();

  const getMealsForDay = (date: Date) => {
    const dateStr = toLocalDateString(date);
    return plans.filter((plan) => plan.planned_date === dateStr);
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDateLocal(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDateLocal(newDate);
  };

  const handleToday = () => {
    setSelectedDateLocal(new Date());
  };

  const handleAddMeal = async () => {
    if (!newPlan.menu_item_id) return;

    try {
      await dispatch(addMealPlan({
        ...newPlan,
        planned_date: toLocalDateString(dialogDate),
        completed: false,
      })).unwrap();

      setDialogOpen(false);
      setNewPlan({ menu_item_id: 0, meal_type: 'dinner', notes: '' });
    } catch (error) {
      console.error('Failed to add meal plan:', error);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    try {
      await dispatch(deleteMealPlan(planId)).unwrap();
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Meal Planner
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please log in to use the meal planner feature.
        </Typography>
        <Button variant="contained" onClick={login} size="large">
          Login with Google
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Meal Planner
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ShoppingCartIcon />}
          size={isMobile ? 'small' : 'medium'}
          onClick={handleGenerateShoppingList}
          disabled={shoppingListLoading}
        >
          {shoppingListLoading ? 'Generating...' : 'Shopping List'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handlePreviousWeek}>
          <ChevronLeft />
        </IconButton>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="h6">
            {weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Typography>
          <Button variant="outlined" size="small" onClick={handleToday}>
            Today
          </Button>
        </Box>
        <IconButton onClick={handleNextWeek}>
          <ChevronRight />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        {weekDays.map((day, index) => {
          const dayMeals = getMealsForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <Grid size={{ xs: 12, sm: 6, md: 3, lg: 1.71 }} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  minHeight: 400,
                  backgroundColor: isToday ? 'action.selected' : 'background.paper',
                  border: isToday ? 2 : 0,
                  borderColor: 'primary.main',
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {DAYS_OF_WEEK[index]}
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {day.getDate()}
                  </Typography>

                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {MEAL_TYPES.map((mealType) => {
                      const meal = dayMeals.find((m) => m.meal_type === mealType);

                      return (
                        <Box key={mealType}>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                            {mealType}
                          </Typography>
                          {meal ? (
                            <Box
                              sx={{
                                p: 1,
                                backgroundColor: 'action.hover',
                                borderRadius: 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  '&:hover': { textDecoration: 'underline' },
                                  flex: 1,
                                }}
                                onClick={() => navigate(`/menu/${meal.menu_item_id}`)}
                              >
                                {meal.meal_name}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleDeletePlan(meal.id)}
                                sx={{ ml: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => {
                                setDialogDate(day);
                                setNewPlan({ ...newPlan, meal_type: mealType as any });
                                setDialogOpen(true);
                              }}
                              fullWidth
                              sx={{ justifyContent: 'flex-start', fontSize: '0.7rem' }}
                            >
                              Add
                            </Button>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Meal</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Meal Type</InputLabel>
              <Select
                value={newPlan.meal_type}
                label="Meal Type"
                onChange={(e) => setNewPlan({ ...newPlan, meal_type: e.target.value as any })}
              >
                {MEAL_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Menu Item</InputLabel>
              <Select
                value={newPlan.menu_item_id}
                label="Menu Item"
                onChange={(e) => setNewPlan({ ...newPlan, menu_item_id: Number(e.target.value) })}
              >
                {menuItems.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} - {item.category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Notes (optional)"
              multiline
              rows={2}
              value={newPlan.notes}
              onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddMeal} variant="contained" disabled={!newPlan.menu_item_id}>
            Add Meal
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MealPlanner;
