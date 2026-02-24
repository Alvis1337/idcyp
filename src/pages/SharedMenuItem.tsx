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
  Divider,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
} from '@mui/material';
import { AccessTime, Restaurant, ContentCopy as CopyIcon } from '@mui/icons-material';
import type { MenuItem } from '../store/menuSlice';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const SharedMenuItem = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchSharedItem = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/share/shared/${token}`);
        if (!response.ok) {
          throw new Error('Shared link not found or expired');
        }
        const data = await response.json();
        setItem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shared item');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedItem();
    }
  }, [token]);

  const copyToMyMenu = async () => {
    if (!item || !user) return;
    setCopying(true);
    try {
      const itemData = {
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        image_url: item.image_url,
        contributor: user.name,
        prep_time_minutes: item.prep_time_minutes,
        cook_time_minutes: item.cook_time_minutes,
        servings: item.servings,
        difficulty: item.difficulty,
        cuisine_type: item.cuisine_type,
        recipes: item.recipes?.map((r) => ({ instructions: r.instructions })) || [],
        ingredients: item.ingredients?.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          notes: i.notes,
          category: i.category,
        })) || [],
        tags: item.tags?.map((t) => t.name) || [],
      };

      const res = await fetch(`${API_BASE_URL}/menu/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(itemData),
      });
      if (!res.ok) throw new Error('Failed to copy');
      setCopySuccess(true);
    } catch {
      setError('Failed to copy to your menu');
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error || !item) {
    return (
      <Container maxWidth="lg" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          {error || 'Item not found'}
        </Typography>
        <Typography color="text.secondary">
          This shared link may have expired or been removed.
        </Typography>
      </Container>
    );
  }

  const totalTime = (item.prep_time_minutes || 0) + (item.cook_time_minutes || 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" color="primary" gutterBottom>
          🍽️ Shared Recipe
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Someone shared this amazing dish with you!
        </Typography>
      </Box>

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
            <Typography variant="h3" component="h1" gutterBottom>
              {item.name}
            </Typography>

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
              </Box>
            )}

            <Typography variant="body1" paragraph>
              {item.description}
            </Typography>

            {item.tags && item.tags.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
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

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            {copySuccess ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Copied to your menu! <Button size="small" onClick={() => navigate('/')}>View Menu</Button>
              </Alert>
            ) : user ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<CopyIcon />}
                onClick={copyToMyMenu}
                disabled={copying}
              >
                {copying ? 'Copying...' : 'Copy to My Menu'}
              </Button>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Log in to copy this recipe to your menu.
                </Typography>
                <Button variant="contained" href="/" size="large">
                  Get Started
                </Button>
              </>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SharedMenuItem;
