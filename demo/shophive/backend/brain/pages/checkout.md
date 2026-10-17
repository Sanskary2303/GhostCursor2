# Checkout Page Context

- Shipping address requires: street address, city, 2-letter state code, and 5-digit US zip code.
- If user wants to checkout without an address saved, ask them for shipping details.
- Valid saved customer address: "123 Main St, New York, NY 10001".
- Payment is simulated with a sandbox demo card ending in 4242.
- Order total includes subtotal + tax (8.25%) + shipping ($5.99, free on subtotal > $75).
- After placing the order, an order confirmation code (e.g. SH-1024) is displayed.
- Form targets: `checkout.address.street`, `checkout.address.city`, `checkout.address.state`, `checkout.address.zip`, `checkout.place_order`.

