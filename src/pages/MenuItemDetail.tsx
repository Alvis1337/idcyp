import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Stack,
  Rating,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack,
  Favorite,
  FavoriteBorder,
  Share,
  AccessTime,
  People,
  Star,
  Edit as EditIcon,
  CalendarMonth,
  Timer,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMenuItem, toggleFavorite, addRating, clearSelectedItem } from '../store/menuSlice';
import { addMealPlan } from '../store/mealPlanSlice';
import { useAuth } from '../contexts/AuthContext';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const MenuItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { selectedItem: item, loading } = useAppSelector((state) => state.menu);

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [plannerDialogOpen, setPlannerDialogOpen] = useState(false);
  const [planDate, setPlanDate] = useState(toLocalDateString(new Date()));
  const [planMealType, setPlanMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [plannerLoading, setPlannerLoading] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchMenuItem(Number(id)));
    }
    return () => {
      dispatch(clearSelectedItem());
    };
  }, [dispatch, id]);

  const handleFavorite = async () => {
    if (!user || !item) return;
    await dispatch(toggleFavorite(item.id));
  };

  const handleSubmitRating = async () => {
    if (!item || userRating === 0) return;
    try {
      await dispatch(addRating({
        id: item.id,
        rating: userRating,
        review: userReview,
      })).unwrap();
      setRatingDialogOpen(false);
      setUserRating(0);
      setUserReview('');
      dispatch(fetchMenuItem(item.id));
    } catch (error) {
      console.error('Failed to add rating:', error);
    }
  };

  const handleAddToPlanner = async () => {
    if (!item) return;
    setPlannerLoading(true);
    try {
      await dispatch(addMealPlan({
        menu_item_id: item.id,
        planned_date: planDate,
        meal_type: planMealType,
        notes: '',
        completed: false,
      })).unwrap();
      setPlannerDialogOpen(false);
    } catch (error) {
      console.error('Failed to add to planner:', error);
    } finally {
      setPlannerLoading(false);
    }
  };

  if (loading || !item) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  const totalTime = (item.prep_time_minutes || 0) + (item.cook_time_minutes || 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
      {/* Top nav */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')}>
          Back to Menu
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {user && (
            <Button
              startIcon={<CalendarMonth />}
              variant="outlined"
              onClick={() => setPlannerDialogOpen(true)}
            >
              Add to Planner
            </Button>
          )}
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => navigate(`/edit/${item.id}`)}
          >
            Edit
          </Button>
        </Box>
      </Box>

      {/* Header card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h3" component="h1" sx={{ flex: 1, mr: 2 }}>
            {item.name}
          </Typography>
          <Box sx={{ display: 'flex', flexShrink: 0 }}>
            {user && (
              <IconButton onClick={handleFavorite} color={item.is_favorite ? 'error' : 'default'}>
                {item.is_favorite ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
            )}
            <IconButton onClick={() => setShareDialogOpen(true)}>
              <Share />
            </IconButton>
          </Box>
        </Box>

        {/* Chips row */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip label={item.category} color="primary" />
          {item.contributor && <Chip label={item.contributor} color="secondary" />}
          {item.difficulty && <Chip label={item.difficulty} variant="outlined" />}
          {item.cuisine_type && <Chip label={item.cuisine_type} variant="outlined" />}
          {item.tags && item.tags.map((tag) => (
            <Chip key={tag.id} label={tag.name} size="small" />
          ))}
        </Stack>

        {/* Stat bar */}
        {(item.prep_time_minutes || item.cook_time_minutes || totalTime > 0 || item.servings) && (
          <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {item.prep_time_minutes ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Prep: <strong>{item.prep_time_minutes} min</strong>
                </Typography>
              </Box>
            ) : null}
            {item.cook_time_minutes ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Timer fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Cook: <strong>{item.cook_time_minutes} min</strong>
                </Typography>
              </Box>
            ) : null}
            {totalTime > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Total: <strong>{totalTime} min</strong>
                </Typography>
              </Box>
            )}
            {item.servings ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <People fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Serves: <strong>{item.servings}</strong>
                </Typography>
              </Box>
            ) : null}
          </Stack>
        )}

        {/* Rating row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Rating value={item.avg_rating ?? 0} readOnly precision={0.5} />
          {(item.avg_rating ?? 0) > 0 && (
            <Typography variant="body2" color="text.secondary">
              {Number(item.avg_rating).toFixed(1)} ({item.rating_count} reviews)
            </Typography>
          )}
          {user && (
            <Button size="small" startIcon={<Star />} onClick={() => setRatingDialogOpen(true)}>
              Rate
            </Button>
          )}
        </Box>

        {/* Description */}
        {item.description && (
          <Typography variant="body1">{item.description}</Typography>
        )}
      </Paper>

      {/* Ingredients + Recipe steps — side by side */}
      {(item.ingredients?.length || item.recipes?.length) ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {item.ingredients && item.ingredients.length > 0 && (
            <Grid size={{ xs: 12, md: item.recipes?.length ? 5 : 12 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h5" gutterBottom>Ingredients</Typography>
                <List dense>
                  {item.ingredients.map((ing, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText
                        primary={ing.name}
                        secondary={
                          [ing.quantity, ing.unit].filter(Boolean).join(' ') +
                          (ing.notes ? ` — ${ing.notes}` : '')
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}

          {item.recipes && item.recipes.length > 0 && (
            <Grid size={{ xs: 12, md: item.ingredients?.length ? 7 : 12 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h5" gutterBottom>Recipe</Typography>
                <List>
                  {item.recipes.map((recipe) => (
                    <ListItem key={recipe.id} alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" fontWeight="600">
                            Step {recipe.step_number}
                          </Typography>
                        }
                        secondary={recipe.instructions}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>
      ) : null}

      {/* Reviews */}
      {item.reviews && item.reviews.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Reviews</Typography>
          <Stack spacing={2}>
            {item.reviews.map((review) => (
              <Box key={review.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Rating value={review.rating} readOnly size="small" />
                  <Typography variant="body2" fontWeight="600">{review.user_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(review.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                {review.review && (
                  <Typography variant="body2" color="text.secondary">{review.review}</Typography>
                )}
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onClose={() => setRatingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rate this dish</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Rating
              value={userRating}
              onChange={(_, newValue) => setUserRating(newValue || 0)}
              size="large"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Your Review (optional)"
              multiline
              rows={4}
              value={userReview}
              onChange={(e) => setUserReview(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitRating} variant="contained" disabled={userRating === 0}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share this dish</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Sharing functionality coming soon!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add to Planner Dialog */}
      <Dialog open={plannerDialogOpen} onClose={() => setPlannerDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add to Planner</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Date"
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Meal</InputLabel>
              <Select
                value={planMealType}
                label="Meal"
                onChange={(e) => setPlanMealType(e.target.value as typeof planMealType)}
              >
                {MEAL_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlannerDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddToPlanner} variant="contained" disabled={!planDate || plannerLoading}>
            {plannerLoading ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MenuItemDetail;
