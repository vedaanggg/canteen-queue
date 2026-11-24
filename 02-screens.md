# Screens & Features

All screens are mobile-first (390px wide) unless stated otherwise.
Every screen needs: a loading state, an empty state, and a friendly error state.

## Screen 1: Menu (/)
**User:** student. **Goal:** pick food fast.

- Top: canteen name, "Open till 5 PM" badge, search box
- When the canteen is closed (after 4:45 PM): show an "Ordering closed" banner
  and disable all Add buttons
- Category tabs (sticky below the header): All | Snacks | Meals | Beverages | Desserts
- Search filters items by name and works together with the category tab
- Item cards, 2 per row on mobile: emoji/photo, name, veg/non-veg dot
  (green = veg, red = non-veg), price in rupees, [ + Add ] button
- After adding, the button becomes [ - 1 + ]. Maximum quantity per item is 10;
  the + button is disabled at 10.
- Sold-out items: greyed out, "Sold out" label, button disabled
- Menu has 15–20 realistic Indian canteen items (samosa, vada pav, masala dosa,
  chai, cold coffee, etc.)
- Bottom sticky bar (only when the cart has items):
  "3 items · ₹140  View cart >"
- Empty state: "No items found" when search/filter matches nothing
- Menu refreshes automatically when the owner changes an item (no reload)

## Screen 2: Cart (/cart)
**User:** student.

- List of items with - / + controls and a remove button; line total per item
- Total at the bottom
- Fields: Student name and Roll number (both required, error message if empty)
- [ Place Order ] big orange button
  - Disabled if the cart is empty
  - Disabled while the request is in progress (prevents double submit)
  - On success, goes to Order Status
- If an item in the cart became Sold out: show a message and remove it
- If the canteen is closed: show "Ordering closed" and disable Place Order
- Empty cart state: "Your cart is empty" with a button back to the menu

## Screen 3: Order Status (/order/:id)
**User:** student, usually on a phone.

- Huge token number (e.g. #42) in the centre, about a third of the screen height
- Student name and ordered items summary
- Progress steps: Placed -> Preparing -> Ready (current step highlighted,
  animated when the status changes)
- Estimated wait: "About 10 min" = about 5 min per order ahead of this one.
  Updates by itself.
- [ Cancel order ] button: visible only while status is Placed, asks for
  confirmation first
- When Ready: green screen, "Collect your order!" message and phone vibration
- When Collected: "Order collected. Thank you!"
- When Cancelled: clear cancelled message
- Page refresh must keep showing the same order
- Invalid/unknown order id: friendly "Order not found" page

## Screen 4: Kitchen Board (/kitchen) — tablet / laptop
**User:** kitchen and counter staff.

- 3 columns: NEW | PREPARING | READY, each with a count
- Each order card: token, student name, items with quantities, time since ordered
  (live-updating)
- Card buttons: NEW [ Start ] -> PREPARING [ Ready ] -> READY [ Collected ]
- Orders older than 15 minutes get a red border/highlight
- New order arrives -> card slides in with a short sound
- Collected orders disappear from the board
- Cancelled orders disappear from the board
- Empty state per column: "No orders yet"
- Changes appear instantly in other browser windows, the customer page and the TV

## Screen 5: Now Serving Display (/display) — TV, 1920x1080
**User:** everyone in the waiting area. No navigation, no buttons, no refresh needed.

- Full screen, dark background, two halves:
  - Left: "Preparing" (grey tokens)
  - Right: "Ready to Collect" (big green tokens)
- Tokens readable from 5 metres away
- A newly Ready token animates (blinks/pulses) for 5 seconds
- Tokens are removed when the order becomes Collected or Cancelled
- Empty state in each half (e.g. "No orders preparing")
- Reconnects automatically if the connection drops

## Screen 6: Menu Manager (/admin)
**User:** canteen owner.

- Summary cards at the top: Today's orders | Items sold | Top-selling item
- Table of items: name, category, price, veg/non-veg, Sold-out toggle, Edit, Delete
- [ + Add item ] opens a form in a side panel
- Item form fields: name, category, price, description, veg/non-veg,
  availability. Show an error message for invalid input.
- Delete asks for confirmation
- Sold-out toggle updates the customer menu immediately
- Empty state: "No items yet. Add your first item."
