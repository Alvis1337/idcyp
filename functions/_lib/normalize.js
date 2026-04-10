function parseJsonField(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return fallback;
}

export function normalizeItem(item) {
  if (!item) return item;
  return {
    ...item,
    is_favorite: item.is_favorite === 1 || item.is_favorite === true,
    tags: parseJsonField(item.tags),
    recipes: parseJsonField(item.recipes),
    ingredients: parseJsonField(item.ingredients),
    reviews: parseJsonField(item.reviews),
  };
}

export function normalizeItems(items) {
  return items.map(normalizeItem);
}

export function normalizeBool(item, ...fields) {
  if (!item) return item;
  const result = { ...item };
  for (const field of fields) {
    result[field] = result[field] === 1 || result[field] === true;
  }
  return result;
}
