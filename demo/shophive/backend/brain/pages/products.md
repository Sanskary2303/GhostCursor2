# Product Detail Page Context

- Shoes are sold in US Men's sizes 7 through 13 (including half sizes: 7.5, 8.5, 9.5, 10.5, 11.5).
- If the user asks to buy or add shoes without specifying a size, ask for their shoe size first.
- If a size is out of stock in warehouse, query warehouse stock and suggest the nearest available size.
- Users can view product details, select a size, and click "Add to Cart".
- The "Add to Cart" button requires a size to be selected first.
- Product targets: `product.size.{sz}`, `product.add_to_cart_btn`, `product.title`, `product.price`.

