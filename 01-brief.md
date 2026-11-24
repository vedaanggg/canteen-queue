# Canteen Order Queue — Brief

## Problem
At lunch break 200+ students crowd one canteen counter. Orders get mixed up and
students wait 15–20 minutes, sometimes missing their next lecture. We need a
simple system where students order from their phone, get a token number, and
see when their food is ready.

## Users
- **Student / faculty:** browses the menu, orders, tracks the order.
- **Kitchen staff:** sees new orders and moves them New -> Preparing -> Ready.
- **Counter staff:** marks an order Collected when the student picks it up.
- **Canteen owner:** adds/edits menu items and marks items Sold out.

## Must-have features
1. Browse the menu by category, with search, veg/non-veg tag and price
2. Cart with quantity controls, then place an order and get a token number
3. Live order tracking page for the customer (updates without refresh)
4. Kitchen Board to move orders: New -> Preparing -> Ready -> Collected
5. TV "Now Serving" display for the waiting area
6. Owner Menu Manager: add, edit, delete items and mark them Sold out
7. Daily summary for the owner: orders today, items sold, top-selling item
8. Ordering closes at 4:45 PM (canteen closes at 5 PM)

## Don't build
Online payment, delivery, login with Google, user accounts, reviews, loyalty
points, notifications by SMS/email, multiple canteens.

## Look & feel
Mobile-first, bright and food-friendly (orange accent #F97316), rounded cards,
big readable tokens.
