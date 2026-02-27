import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Divider,
  Chip,
  Stack,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { fetchMenuItem, updateMenuItem } from '../store/menuSlice';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = ['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Side Dish', 'Snack'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const CUISINES = ['Italian', 'Mexican', 'Asian', 'American', 'French', 'Indian', 'Mediterranean', 'Other'];

const EditMenuItem = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [contributors, setContributors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    contributor: '',
    prep_time_minutes: '',
    cook_time_minutes: '',
    servings: '4',
    difficulty: '',
    cuisine_type: '',
  });

  const [recipes, setRecipes] = useState<Array<{ instructions: string }>>([{ instructions: '' }]);
  const [ingredients, setIngredients] = useState<Array<{ name: string; quantity: string; unit: string; notes: string }>>([
    { name: '', quantity: '', unit: '', notes: '' },
  ]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        const res = await fetch('/api/groups/active', { credentials: 'include' });
        if (!res.ok) return;
        const group = await res.json();
        if (!group) return;
        const membersRes = await fetch(`/api/groups/${group.id}/members`, { credentials: 'include' });
        if (!membersRes.ok) return;
        const members = await membersRes.json();
        const names = members.map((m: any) => m.name).filter(Boolean);
        if (names.length > 1) names.push('Both');
        setContributors(names);
      } catch {
        // fall back to empty
      }
    };
    if (user) fetchContributors();
  }, [user]);

  useEffect(() => {
    if (!id) return;
    const loadItem = async () => {
      try {
        const item = await dispatch(fetchMenuItem(Number(id))).unwrap();
        setFormData({
          name: item.name || '',
          description: item.description || '',
          category: item.category || '',
          contributor: item.contributor || '',
          prep_time_minutes: item.prep_time_minutes ? String(item.prep_time_minutes) : '',
          cook_time_minutes: item.cook_time_minutes ? String(item.cook_time_minutes) : '',
          servings: item.servings ? String(item.servings) : '4',
          difficulty: item.difficulty || '',
          cuisine_type: item.cuisine_type || '',
        });
        if (item.recipes && item.recipes.length > 0) {
          setRecipes(item.recipes.map((r: any) => ({ instructions: r.instructions })));
        }
        if (item.ingredients && item.ingredients.length > 0) {
          setIngredients(item.ingredients.map((i: any) => ({
            name: i.name || '',
            quantity: i.quantity ? String(i.quantity) : '',
            unit: i.unit || '',
            notes: i.notes || '',
          })));
        }
        if (item.tags && item.tags.length > 0) {
          setTags(item.tags.map((t: any) => t.name));
        }
      } catch {
        setError('Failed to load menu item.');
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [id, dispatch]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addRecipeStep = () => {
    setRecipes([...recipes, { instructions: '' }]);
  };

  const updateRecipeStep = (index: number, value: string) => {
    const updated = [...recipes];
    updated[index].instructions = value;
    setRecipes(updated);
  };

  const removeRecipeStep = (index: number) => {
    setRecipes(recipes.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '', notes: '' }]);
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      login();
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter a dish name.');
      return;
    }

    if (!formData.category) {
      setError('Please select a category.');
      return;
    }

    setSubmitting(true);
    try {
      const itemData: any = {
        id: Number(id),
        ...formData,
        prep_time_minutes: parseInt(formData.prep_time_minutes) || 0,
        cook_time_minutes: parseInt(formData.cook_time_minutes) || 0,
        servings: parseInt(formData.servings) || 4,
        recipes: recipes.filter((r) => r.instructions.trim()),
        ingredients: ingredients.filter((i) => i.name.trim()).map(ing => ({
          ...ing,
          quantity: parseFloat(ing.quantity) || 0,
        })),
        tags: tags,
      };

      await dispatch(updateMenuItem(itemData)).unwrap();
      navigate(`/menu/${id}`);
    } catch (err: any) {
      console.error('Failed to update menu item:', err);
      setError(err?.message || 'Failed to update menu item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Edit Menu Item</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please log in to edit menu items.
        </Typography>
        <Button variant="contained" onClick={login} size="large">Login with Google</Button>
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
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Menu Item
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>Basic Information</Typography>

          <TextField
            fullWidth
            label="Dish Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>Cooking Details</Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Prep Time (min)"
                type="number"
                value={formData.prep_time_minutes}
                onChange={(e) => handleChange('prep_time_minutes', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Cook Time (min)"
                type="number"
                value={formData.cook_time_minutes}
                onChange={(e) => handleChange('cook_time_minutes', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Servings"
                type="number"
                value={formData.servings}
                onChange={(e) => handleChange('servings', e.target.value)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={formData.difficulty}
                  label="Difficulty"
                  onChange={(e) => handleChange('difficulty', e.target.value)}
                >
                  {DIFFICULTIES.map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Cuisine</InputLabel>
                <Select
                  value={formData.cuisine_type}
                  label="Cuisine"
                  onChange={(e) => handleChange('cuisine_type', e.target.value)}
                >
                  {CUISINES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Contributor</InputLabel>
                <Select
                  value={formData.contributor}
                  label="Contributor"
                  onChange={(e) => handleChange('contributor', e.target.value)}
                >
                  {contributors.map((cont) => (
                    <MenuItem key={cont} value={cont}>{cont}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Ingredients</Typography>
            <Button startIcon={<AddIcon />} onClick={addIngredient} size="small">
              Add Ingredient
            </Button>
          </Box>

          {ingredients.map((ing, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="Name"
                value={ing.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                sx={{ flex: 2 }}
                size="small"
              />
              <TextField
                label="Quantity"
                type="number"
                value={ing.quantity}
                onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                sx={{ flex: 1 }}
                size="small"
              />
              <TextField
                label="Unit"
                value={ing.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                sx={{ flex: 1 }}
                size="small"
              />
              <IconButton onClick={() => removeIngredient(index)} size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Recipe Steps</Typography>
            <Button startIcon={<AddIcon />} onClick={addRecipeStep} size="small">
              Add Step
            </Button>
          </Box>

          {recipes.map((recipe, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label={`Step ${index + 1}`}
                value={recipe.instructions}
                onChange={(e) => updateRecipeStep(index, e.target.value)}
                multiline
                rows={2}
                size="small"
              />
              <IconButton onClick={() => removeRecipeStep(index)} size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>Tags</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              label="Add Tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              size="small"
              fullWidth
            />
            <Button onClick={addTag} variant="outlined">Add</Button>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag) => (
              <Chip key={tag} label={tag} onDelete={() => removeTag(tag)} />
            ))}
          </Stack>

          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate(`/menu/${id}`)}
              size="large"
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditMenuItem;
