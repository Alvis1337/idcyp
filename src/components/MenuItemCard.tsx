import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActions,
  IconButton,
  Box,
  Chip,
  Rating,
  Stack,
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  AccessTime as TimeIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import type { MenuItem } from '../store/menuSlice';
import { useAppDispatch } from '../store/hooks';
import { deleteMenuItem, toggleFavorite } from '../store/menuSlice';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard = ({ item }: MenuItemCardProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await dispatch(deleteMenuItem(item.id)).unwrap();
      } catch (error) {
        console.error('Failed to delete menu item:', error);
      }
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await dispatch(toggleFavorite(item.id)).unwrap();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleCardClick = () => {
    navigate(`/menu/${item.id}`);
  };

  const formatPrice = (price: number | string | undefined) => {
    if (!price) return '0.00';
    const numPrice = typeof price === 'number' ? price : parseFloat(price);
    return numPrice.toFixed(2);
  };

  const totalTime = (item.prep_time_minutes || 0) + (item.cook_time_minutes || 0);

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={handleCardClick}
    >
      {item.image_url && (
        <CardMedia
          component="img"
          height="180"
          image={item.image_url}
          alt={item.name}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Typography gutterBottom variant="h6" component="h3" sx={{ mb: 0, flexGrow: 1 }}>
            {item.name}
          </Typography>
          {user && (
            <IconButton 
              size="small" 
              onClick={handleFavorite}
              color={item.is_favorite ? 'error' : 'default'}
              sx={{ mt: -0.5 }}
            >
              {item.is_favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          )}
        </Box>

        {(item.avg_rating ?? 0) > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Rating value={item.avg_rating} readOnly size="small" precision={0.5} />
            <Typography variant="caption" color="text.secondary">
              ({item.rating_count})
            </Typography>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {item.description?.length > 100 
            ? `${item.description.substring(0, 100)}...` 
            : item.description}
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          {item.cuisine_type && (
            <Chip label={item.cuisine_type} size="small" variant="outlined" />
          )}
          {item.difficulty && (
            <Chip label={item.difficulty} size="small" color="primary" variant="outlined" />
          )}
          {totalTime > 0 && (
            <Chip 
              icon={<TimeIcon />} 
              label={`${totalTime}min`} 
              size="small" 
              variant="outlined" 
            />
          )}
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {item.price && (
            <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
              ${formatPrice(item.price)}
            </Typography>
          )}
          <Chip 
            label={item.contributor} 
            size="small" 
            color="secondary" 
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1.5, pt: 0 }}>
        <Box>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); }} aria-label="share">
            <ShareIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box>
          <IconButton 
            size="small" 
            color="primary" 
            aria-label="edit"
            onClick={(e) => { e.stopPropagation(); navigate(`/edit/${item.id}`); }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            color="error" 
            aria-label="delete" 
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
};

export default MenuItemCard;
