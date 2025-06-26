import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get menu items by restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { category, available } = req.query;
    
    let query = 'SELECT * FROM menu_items WHERE restaurant_id = ?';
    const params = [req.params.restaurantId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (available !== undefined) {
      query += ' AND is_available = ?';
      params.push(available === 'true');
    }

    query += ' ORDER BY category, name';

    const [menuItems] = await pool.execute(query, params);
    res.json(menuItems);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get menu item by ID
router.get('/:id', async (req, res) => {
  try {
    const [menuItems] = await pool.execute(
      'SELECT * FROM menu_items WHERE id = ?',
      [req.params.id]
    );

    if (menuItems.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(menuItems[0]);
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Create menu item (owner only)
router.post('/', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const {
      restaurant_id,
      name,
      description,
      price,
      image,
      category,
      prep_time
    } = req.body;

    // Verify restaurant ownership
    const [restaurants] = await pool.execute(
      'SELECT owner_id FROM restaurants WHERE id = ?',
      [restaurant_id]
    );

    if (restaurants.length === 0 || restaurants[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to add items to this restaurant' });
    }

    const [result] = await pool.execute(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, price, image, category, prep_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, name, description, price, image, category, prep_time]
    );

    res.status(201).json({
      message: 'Menu item created successfully',
      itemId: result.insertId
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item (owner only)
router.put('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const itemId = req.params.id;

    // Verify ownership
    const [items] = await pool.execute(
      `SELECT mi.*, r.owner_id 
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = ?`,
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (items[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this menu item' });
    }

    const {
      name,
      description,
      price,
      image,
      category,
      prep_time,
      is_available
    } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (price !== undefined) { updateFields.push('price = ?'); updateValues.push(price); }
    if (image !== undefined) { updateFields.push('image = ?'); updateValues.push(image); }
    if (category !== undefined) { updateFields.push('category = ?'); updateValues.push(category); }
    if (prep_time !== undefined) { updateFields.push('prep_time = ?'); updateValues.push(prep_time); }
    if (is_available !== undefined) { updateFields.push('is_available = ?'); updateValues.push(is_available); }

    if (updateFields.length > 0) {
      updateValues.push(itemId);
      await pool.execute(
        `UPDATE menu_items SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    res.json({ message: 'Menu item updated successfully' });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item (owner only)
router.delete('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const itemId = req.params.id;

    // Verify ownership
    const [items] = await pool.execute(
      `SELECT mi.*, r.owner_id 
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = ?`,
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (items[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this menu item' });
    }

    await pool.execute('DELETE FROM menu_items WHERE id = ?', [itemId]);

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

export default router;