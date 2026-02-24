import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ShoppingListSummary {
  id: number;
  name: string;
  item_count: number;
  checked_count: number;
  created_at: string;
}

interface ShoppingListItem {
  id: number;
  ingredient_name: string;
  ingredient_category: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

interface ShoppingListDetail {
  id: number;
  name: string;
  created_at: string;
  items: ShoppingListItem[];
}

const ShoppingList = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [lists, setLists] = useState<ShoppingListSummary[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingListDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    try {
      const response = await fetch('/api/meals/shopping-lists', {
        credentials: 'include',
      });
      if (response.ok) {
        setLists(await response.json());
      }
    } catch (error) {
      console.error('Error fetching shopping lists:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchListDetail = async (id: number) => {
    try {
      const response = await fetch(`/api/meals/shopping-lists/${id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        setSelectedList(await response.json());
      }
    } catch (error) {
      console.error('Error fetching shopping list:', error);
    }
  };

  const toggleItem = async (listId: number, itemId: number) => {
    try {
      await fetch(`/api/meals/shopping-lists/${listId}/items/${itemId}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (selectedList) {
        setSelectedList({
          ...selectedList,
          items: selectedList.items.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        });
      }
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const deleteList = async (id: number) => {
    try {
      await fetch(`/api/meals/shopping-lists/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setLists(lists.filter((l) => l.id !== id));
      if (selectedList?.id === id) {
        setSelectedList(null);
      }
    } catch (error) {
      console.error('Error deleting shopping list:', error);
    }
  };

  useEffect(() => {
    if (user) fetchLists();
  }, [user, fetchLists]);

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Shopping Lists</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please log in to view your shopping lists.
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

  if (selectedList) {
    const categories = [...new Set(selectedList.items.map((i) => i.ingredient_category))];

    return (
      <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconButton onClick={() => setSelectedList(null)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>{selectedList.name}</Typography>
          <Chip
            label={`${selectedList.items.filter((i) => i.checked).length}/${selectedList.items.length}`}
            color="primary"
            variant="outlined"
          />
        </Box>

        {selectedList.items.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No items in this list. Add meals to your planner first, then generate a shopping list.
          </Typography>
        ) : (
          categories.map((category) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                {category || 'Other'}
              </Typography>
              <Card>
                <List disablePadding>
                  {selectedList.items
                    .filter((item) => item.ingredient_category === category)
                    .map((item, index, arr) => (
                      <Box key={item.id}>
                        <ListItem disablePadding>
                          <ListItemButton onClick={() => toggleItem(selectedList.id, item.id)} dense>
                            <ListItemIcon>
                              <Checkbox edge="start" checked={item.checked} tabIndex={-1} disableRipple />
                            </ListItemIcon>
                            <ListItemText
                              primary={item.ingredient_name}
                              secondary={item.quantity && item.unit ? `${item.quantity} ${item.unit}` : undefined}
                              sx={{ textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.5 : 1 }}
                            />
                          </ListItemButton>
                        </ListItem>
                        {index < arr.length - 1 && <Divider />}
                      </Box>
                    ))}
                </List>
              </Card>
            </Box>
          ))
        )}
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Shopping Lists</Typography>
        <Button variant="outlined" onClick={() => navigate('/planner')}>
          Go to Planner
        </Button>
      </Box>

      {lists.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <ShoppingCartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No shopping lists yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add meals to your planner and click "Shopping List" to generate one.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/planner')}>Go to Planner</Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {lists.map((list) => (
            <Card key={list.id}>
              <CardContent
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => fetchListDetail(list.id)}
              >
                <Typography variant="h6">{list.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    size="small"
                    label={`${list.checked_count}/${list.item_count} items`}
                    color={list.checked_count === list.item_count && list.item_count > 0 ? 'success' : 'default'}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={new Date(list.created_at).toLocaleDateString()}
                  />
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deleteList(list.id)}>
                  Delete
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default ShoppingList;
