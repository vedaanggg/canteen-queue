import { queryRows } from '../db/database.js';

export const menuCategories = ['Snacks', 'Meals', 'Beverages', 'Desserts'];

export function getMenu() {
  const items = queryRows(`
    SELECT id, name, category, price, description, emoji,
           is_vegetarian AS isVegetarian, is_available AS isAvailable
    FROM menu_items
    ORDER BY CASE category
      WHEN 'Snacks' THEN 1
      WHEN 'Meals' THEN 2
      WHEN 'Beverages' THEN 3
      WHEN 'Desserts' THEN 4
      ELSE 5
    END, id
  `).map((item) => ({
    ...item,
    id: Number(item.id),
    price: Number(item.price),
    isVegetarian: Boolean(item.isVegetarian),
    isAvailable: Boolean(item.isAvailable),
  }));

  return { categories: menuCategories, items };
}
