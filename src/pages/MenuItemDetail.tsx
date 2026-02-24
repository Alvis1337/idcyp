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
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  Favorite,
  FavoriteBorder,
  Share,
  AccessTime,
  Restaurant,
  Star,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMenuItem, toggleFavorite, addRating, clearSelectedItem } from '../store/menuSlice';
import { useAuth } from '../contexts/AuthContext';

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
        review: userReview 
      })).unwrap();
      setRatingDialogOpen(false);
      setUserRating(0);
      setUserReview('');
      // Refetch item to get updated rating
      dispatch(fetchMenuItem(item.id));
    } catch (error) {
      console.error('Failed to add rating:', error);
    }
  };

  const handleShare = () => {
    setShareDialogOpen(true);
    // TODO: Implement share link generation
  };

  const formatPrice = (price: number | string | undefined) => {
    if (!price) return '0.00';
    const numPrice = typeof price === 'number' ? price : parseFloat(price);
    return numPrice.toFixed(2);
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
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Back to Menu
      </Button>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          {item.image_url && (
            <Paper
              component="img"
              src={item.image_url}
              alt={item.name}
              sx={{ width: '100%', height: 'auto', borderRadius: 2 }}
            />
          )}

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Info</Typography>
              <Stack spacing={1}>
                {item.prep_time_minutes && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime fontSize="small" />
                    <Typography variant="body2">
                      Prep: {item.prep_time_minutes} min
                    </Typography>
                  </Box>
                )}
                {item.cook_time_minutes && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Restaurant fontSize="small" />
                    <Typography variant="body2">
                      Cook: {item.cook_time_minutes} min
                    </Typography>
                  </Box>
                )}
                {item.servings && (
                  <Typography variant="body2">
                    Servings: {item.servings}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
              <Typography variant="h3" component="h1">
                {item.name}
              </Typography>
              <Box>
                {user && (
                  <IconButton onClick={handleFavorite} color={item.is_favorite ? 'error' : 'default'}>
                    {item.is_favorite ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                )}
                <IconButton onClick={handleShare}>
                  <Share />
                </IconButton>
              </Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Chip label={item.category} color="primary" />
              <Chip label={item.contributor} color="secondary" />
              {item.difficulty && <Chip label={item.difficulty} variant="outlined" />}
              {item.cuisine_type && <Chip label={item.cuisine_type} variant="outlined" />}
              {totalTime > 0 && <Chip icon={<AccessTime />} label={`${totalTime} min`} variant="outlined" />}
            </Stack>

            {(item.avg_rating ?? 0) > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Rating value={item.avg_rating} readOnly precision={0.5} />
                <Typography variant="body2" color="text.secondary">
                  {item.avg_rating?.toFixed(1)} ({item.rating_count} reviews)
                </Typography>
                {user && (
                  <Button size="small" startIcon={<Star />} onClick={() => setRatingDialogOpen(true)}>
                    Rate
                  </Button>
                )}
              </Box>
            )}

            {item.price && (
              <Typography variant="h4" color="primary" sx={{ mb: 2, fontWeight: 700 }}>
                ${formatPrice(item.price)}
              </Typography>
            )}

            <Typography variant="body1" paragraph>
              {item.description}
            </Typography>

            {item.tags && item.tags.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {item.tags.map((tag) => (
                  <Chip key={tag.id} label={tag.name} size="small" />
                ))}
              </Stack>
            )}
          </Paper>

          {item.ingredients && item.ingredients.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h5" gutterBottom>Ingredients</Typography>
              <List>
                {item.ingredients.map((ing, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={ing.name}
                      secondary={`${ing.quantity} ${ing.unit}${ing.notes ? ` - ${ing.notes}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {item.recipes && item.recipes.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h5" gutterBottom>Recipe</Typography>
              <List>
                {item.recipes.map((recipe) => (
                  <ListItem key={recipe.id} alignItems="flex-start">
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
          )}

          {item.reviews && item.reviews.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h5" gutterBottom>Reviews</Typography>
              <Stack spacing={2}>
                {item.reviews.map((review) => (
                  <Box key={review.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Rating value={review.rating} readOnly size="small" />
                      <Typography variant="body2" fontWeight="600">
                        {review.user_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(review.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    {review.review && (
                      <Typography variant="body2" color="text.secondary">
                        {review.review}
                      </Typography>
                    )}
                    <Divider sx={{ mt: 2 }} />
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>

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
    </Container>
  );
};

export default MenuItemDetail;
