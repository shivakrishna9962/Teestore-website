# Implementation Plan: T-Shirt E-Commerce Platform

## Overview

Incremental implementation starting from data models, through API routes, Redux state, shared components, pages, and admin panel. Each phase builds on the previous. Property-based tests use `fast-check` and are placed close to the code they validate.

## Tasks

- [x] 1. Extend and create Mongoose data models
  - [x] 1.1 Extend `src/models/User.ts` with `status`, `oauthProvider`, `oauthId`, `marketingOptOut`, `resetToken`, `resetTokenExpiry` fields
    - _Requirements: 1.1, 1.5, 1.7, 9.6, 13.2_
  - [x] 1.2 Extend `src/models/Product.ts` with `colors`, `featured`, `active` fields; rename `name` → `title`; store `price` in cents; add MongoDB text index on `title`, `description`, `category`
    - _Requirements: 3.2, 10.2, 10.6_
  - [x] 1.3 Create `src/models/Inventory.ts` with compound unique index `{ product, size, color }`
    - _Requirements: 11.1, 11.3_
  - [x] 1.4 Create `src/models/Cart.ts` with `ICartItem` sub-document and unique index on `user`
    - _Requirements: 5.1, 5.2_
  - [x] 1.5 Create `src/models/Wishlist.ts` with unique index on `user`
    - _Requirements: 4.1_
  - [x] 1.6 Extend `src/models/Order.ts` with `color` on items, `statusHistory`, `trackingNumber`, `carrier`, `invoiceId`, `discountAmount`, `deliveryMethod`
    - _Requirements: 6.5, 7.4, 7.6, 12.3_
  - [x] 1.7 Create `src/models/Invoice.ts` with unique index on `order`; create `src/models/Counter.ts` for sequential invoice numbers
    - _Requirements: 8.1, 8.4_
  - [x] 1.8 Create `src/models/Notification.ts` with TTL index on `createdAt` (30 days)
    - _Requirements: 9.1, 9.5_
  - [x] 1.9 Create `src/models/DiscountCode.ts`
    - _Requirements: 5.6, 5.7_
  - [ ]* 1.10 Write property tests for data model invariants
    - **Property 18: Cart quantity management invariant** — Validates: Requirements 5.2, 5.3
    - **Property 19: Cart total arithmetic invariant** — Validates: Requirements 5.5
    - **Property 32: Invoice numbers are unique and sequential** — Validates: Requirements 8.4

- [x] 2. Update TypeScript types
  - [x] 2.1 Update `src/types/user.ts`, `src/types/product.ts`, `src/types/order.ts` to match extended model interfaces; add `src/types/cart.ts`, `src/types/wishlist.ts`, `src/types/invoice.ts`, `src/types/notification.ts`, `src/types/discount.ts`
    - _Requirements: all_

- [x] 3. Configure NextAuth.js and middleware
  - [x] 3.1 Create `src/app/api/auth/[...nextauth]/route.ts` with `CredentialsProvider` (bcrypt) and `GoogleProvider`; attach `role` and `status` to JWT and session callbacks
    - _Requirements: 1.3, 1.7_
  - [x] 3.2 Create `src/middleware.ts` protecting `/wishlist`, `/cart`, `/checkout`, `/orders/*` (require session) and `/admin/*` (require `role === 'admin'`); redirect suspended users to `/suspended`; preserve `callbackUrl` on session expiry
    - _Requirements: 1.6, 4.6, 6.1, 10.1_
  - [ ]* 3.3 Write property tests for auth invariants
    - **Property 1: Password length invariant** — Validates: Requirements 1.1
    - **Property 2: Duplicate email rejection** — Validates: Requirements 1.2
    - **Property 3: Generic invalid-credentials error** — Validates: Requirements 1.4
    - **Property 4: Session expiry preserves destination URL** — Validates: Requirements 1.6
    - **Property 5: Logout invalidates session** — Validates: Requirements 1.8
    - **Property 37: Non-admin users receive 403 on admin routes** — Validates: Requirements 10.1

- [x] 4. Auth API routes
  - [x] 4.1 Create `src/app/api/auth/register/route.ts` — validate email uniqueness, hash password with bcrypt, create User, send registration notification
    - _Requirements: 1.1, 1.2, 9.4_
  - [x] 4.2 Create `src/app/api/auth/reset-password/route.ts` (request) and `src/app/api/auth/reset-password/confirm/route.ts` (confirm) — generate/hash token, store expiry, send email, verify on confirm
    - _Requirements: 1.5, 9.4_

- [x] 5. Checkpoint — Ensure auth models, NextAuth config, and middleware tests pass; ask the user if questions arise.

- [x] 6. Product API routes
  - [x] 6.1 Create `src/app/api/products/route.ts` — `GET` with text search, category/size/color/price filters, sort options, 12-per-page pagination; `POST` (admin) creates product, initializes Inventory records at zero for each size×color variant
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.2, 10.3_
  - [x] 6.2 Create `src/app/api/products/[id]/route.ts` — `GET` returns full product with variant inventory; `PUT` (admin) updates fields; `DELETE` (admin) soft-deletes (`active = false`)
    - _Requirements: 3.7, 10.5, 10.6_
  - [x] 6.3 Create `src/app/api/products/[id]/images/route.ts` — `POST` (admin) uploads to Cloudinary, reorders or removes images
    - _Requirements: 10.7_
  - [ ]* 6.4 Write property tests for product service
    - **Property 6: New Arrivals shows exactly 8 most recent products** — Validates: Requirements 2.3
    - **Property 7: Featured section contains only featured products** — Validates: Requirements 2.5
    - **Property 8: Pagination completeness** — Validates: Requirements 3.1
    - **Property 9: Filters narrow results correctly** — Validates: Requirements 3.4
    - **Property 10: Sort order consistency** — Validates: Requirements 3.6
    - **Property 11: Product detail contains all required fields** — Validates: Requirements 3.7
    - **Property 12: Variant stock reflects selected combination** — Validates: Requirements 3.8
    - **Property 13: Zero-stock variant disables Add to Cart** — Validates: Requirements 3.9
    - **Property 38: New product variants initialized with zero stock** — Validates: Requirements 10.3
    - **Property 39: Soft-deleted products excluded from shopper views** — Validates: Requirements 10.6

- [x] 7. Inventory API routes
  - [x] 7.1 Create `src/app/api/inventory/route.ts` — `GET` (admin) lists all variants with stock counts
    - _Requirements: 11.1_
  - [x] 7.2 Create `src/app/api/inventory/[variantId]/route.ts` — `PUT` (admin) updates stock count; triggers low-stock notification if stock falls below threshold
    - _Requirements: 11.2, 11.3, 11.4_
  - [x] 7.3 Create `src/app/api/inventory/import/route.ts` — `POST` (admin) parses CSV, validates each row independently, applies valid rows, returns row-level error report
    - _Requirements: 11.5, 11.6_
  - [ ]* 7.4 Write property tests for inventory service
    - **Property 40: Admin stock update reflects on shopper detail page** — Validates: Requirements 11.2
    - **Property 41: Low-stock threshold triggers admin notification** — Validates: Requirements 11.4
    - **Property 42: CSV import applies only valid rows** — Validates: Requirements 11.6

- [x] 8. Cart API routes
  - [x] 8.1 Create `src/app/api/cart/route.ts` — `GET` returns cart with populated product data; `POST` adds or increments item (upsert by product+size+color), snapshots `unitPrice`
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 8.2 Create `src/app/api/cart/[itemId]/route.ts` — `DELETE` removes item; `PUT` updates quantity (removes if quantity = 0)
    - _Requirements: 5.3_
  - [x] 8.3 Create `src/app/api/cart/discount/route.ts` — `POST` validates discount code (active, not expired, usage limit), applies discount amount, returns updated totals
    - _Requirements: 5.6, 5.7_
  - [ ]* 8.4 Write property tests for cart service
    - **Property 20: Valid discount reduces total** — Validates: Requirements 5.6
    - **Property 21: Invalid discount leaves total unchanged** — Validates: Requirements 5.7
    - **Property 22: Out-of-stock cart item disables checkout** — Validates: Requirements 5.8

- [x] 9. Wishlist API routes
  - [x] 9.1 Create `src/app/api/wishlist/route.ts` — `GET` returns wishlist with populated product data; `POST` adds product (idempotent)
    - _Requirements: 4.1, 4.4_
  - [x] 9.2 Create `src/app/api/wishlist/[productId]/route.ts` — `DELETE` removes product from wishlist
    - _Requirements: 4.3_
  - [ ]* 9.3 Write property tests for wishlist service
    - **Property 14: Wishlist round-trip persistence** — Validates: Requirements 4.1
    - **Property 15: Wishlist toggle is an involution** — Validates: Requirements 4.2, 4.3
    - **Property 16: Wishlist page shows all saved products** — Validates: Requirements 4.4
    - **Property 17: Adding wishlist item to cart retains it in wishlist** — Validates: Requirements 4.5

- [x] 10. Checkout and Order API routes
  - [x] 10.1 Create `src/app/api/checkout/session/route.ts` — creates Stripe PaymentIntent from cart totals, returns `clientSecret`
    - _Requirements: 6.4_
  - [x] 10.2 Create `src/app/api/checkout/confirm/route.ts` — verifies PaymentIntent status with Stripe SDK, atomically creates Order (status "Confirmed"), decrements inventory with `$inc`/`$gte` guard, clears cart, triggers order confirmation notification and invoice generation
    - _Requirements: 6.5, 6.6, 6.7, 6.8_
  - [x] 10.3 Create `src/app/api/webhooks/stripe/route.ts` — handles async Stripe payment events as fallback
    - _Requirements: 6.4_
  - [ ]* 10.4 Write property tests for checkout service
    - **Property 23: Shipping address validation rejects incomplete addresses** — Validates: Requirements 6.3
    - **Property 24: Successful payment atomically creates order, decrements inventory, clears cart** — Validates: Requirements 6.5
    - **Property 25: Payment failure preserves cart** — Validates: Requirements 6.6

- [x] 11. Order API routes
  - [x] 11.1 Create `src/app/api/orders/route.ts` — `GET` returns shopper's own orders sorted by `createdAt` desc; admin sees all orders with status/date/name filters
    - _Requirements: 7.1, 7.2, 12.1, 12.2_
  - [x] 11.2 Create `src/app/api/orders/[id]/route.ts` — `GET` returns full order detail; enforces ownership (404 for non-owner non-admin)
    - _Requirements: 7.3, 7.7_
  - [x] 11.3 Create `src/app/api/orders/[id]/status/route.ts` — `PUT` (admin) validates status transition sequence, requires tracking+carrier for "Shipped", appends to `statusHistory`, triggers shopper notification
    - _Requirements: 7.4, 7.5, 7.6, 12.3, 12.4_
  - [x] 11.4 Create `src/app/api/orders/export/route.ts` — `GET` (admin) streams CSV of filtered orders
    - _Requirements: 12.6_
  - [ ]* 11.5 Write property tests for order service
    - **Property 27: Order history sorted most recent first** — Validates: Requirements 7.1
    - **Property 28: Order status transitions follow defined lifecycle** — Validates: Requirements 7.4
    - **Property 29: Shipped orders display tracking information** — Validates: Requirements 7.6
    - **Property 30: Orders are scoped to their owner** — Validates: Requirements 7.7
    - **Property 43: Admin order filter returns only matching orders** — Validates: Requirements 12.2
    - **Property 44: Status change log contains timestamp and admin ID** — Validates: Requirements 12.3
    - **Property 45: Shipped status requires tracking number** — Validates: Requirements 12.4
    - **Property 46: CSV export matches filtered order list** — Validates: Requirements 12.6

- [x] 12. Invoice service and API route
  - [x] 12.1 Create `src/services/invoice.ts` — `generate(orderId)` fetches order, builds PDF with `pdf-lib` (invoice number via atomic Counter increment, formatted `INV-XXXXXX`), uploads to Cloudinary, creates Invoice document, links `order.invoiceId`
    - _Requirements: 8.1, 8.2, 8.4_
  - [x] 12.2 Create `src/app/api/invoices/[orderId]/route.ts` — `GET` redirects to stored PDF URL; `POST` generates on demand if not yet created
    - _Requirements: 8.2, 8.3, 8.5_
  - [ ]* 12.3 Write property tests for invoice service
    - **Property 26: Confirmed order has an invoice** — Validates: Requirements 6.8, 8.5
    - **Property 31: Invoice contains all required fields** — Validates: Requirements 8.1
    - **Property 32: Invoice numbers are unique and sequential** — Validates: Requirements 8.4

- [x] 13. Notification service and API routes
  - [x] 13.1 Create `src/services/notification.ts` — `create(userId, event, message)` inserts Notification; `sendEmail(to, template, data)` calls Resend API; checks `marketingOptOut` before sending promotional emails
    - _Requirements: 9.1, 9.4, 9.6_
  - [x] 13.2 Create `src/app/api/notifications/route.ts` — `GET` returns user's notifications (supports `?unreadOnly=true`); `PUT` marks all as read
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ]* 13.3 Write property tests for notification service
    - **Property 33: Unread badge count matches unread notifications** — Validates: Requirements 9.2
    - **Property 34: Opening notification panel marks all as read** — Validates: Requirements 9.3
    - **Property 35: Notifications older than 30 days are not returned** — Validates: Requirements 9.5
    - **Property 36: Marketing opt-out suppresses promotional emails** — Validates: Requirements 9.6

- [x] 14. Admin user management API routes
  - [x] 14.1 Create `src/app/api/admin/users/route.ts` — `GET` lists all users with name, email, registration date, order count, status
    - _Requirements: 13.1_
  - [x] 14.2 Create `src/app/api/admin/users/[id]/suspend/route.ts` and `src/app/api/admin/users/[id]/reinstate/route.ts` — update `user.status`; prevent self-suspension; suspended users blocked at middleware
    - _Requirements: 13.2, 13.3, 13.5_
  - [ ]* 14.3 Write property tests for user management
    - **Property 47: Suspend/reinstate round-trip restores login capability** — Validates: Requirements 13.2, 13.3
    - **Property 48: Admin cannot suspend or delete own account** — Validates: Requirements 13.5

- [x] 15. Admin dashboard API route
  - [x] 15.1 Create `src/app/api/admin/dashboard/route.ts` — aggregates: current-month revenue, current-month orders, new shoppers this month, top-5 best-selling products, daily revenue for past 30 days, 10 most recent orders
    - _Requirements: 14.1, 14.2, 14.3_
  - [ ]* 15.2 Write property tests for dashboard metrics
    - **Property 49: Dashboard metrics match underlying data** — Validates: Requirements 14.1
    - **Property 50: Revenue trend chart data matches daily order totals** — Validates: Requirements 14.2
    - **Property 51: Recent orders widget shows 10 most recent** — Validates: Requirements 14.3

- [x] 16. Checkpoint — Ensure all API route tests pass; ask the user if questions arise.

- [x] 17. Redux Toolkit slices (client state)
  - [x] 17.1 Extend `src/features/cart/cartSlice.ts` — sync with `/api/cart` on mutations (optimistic update + server sync); compute subtotal, taxes, shipping, discount, total
    - _Requirements: 5.1, 5.4, 5.5_
  - [x] 17.2 Create `src/features/wishlist/wishlistSlice.ts` — store wishlist product IDs; sync with `/api/wishlist` on add/remove
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 17.3 Create `src/features/notifications/notificationsSlice.ts` — store notification list and unread count; poll `/api/notifications?unreadOnly=true` every 30 seconds
    - _Requirements: 9.1, 9.2_
  - [x] 17.4 Extend `src/features/products/productsSlice.ts` — store search query, active filters, sort option, current page
    - _Requirements: 3.3, 3.4, 3.5_

- [x] 18. Shared UI components
  - [x] 18.1 Extend `src/components/Navbar.tsx` — add notification bell with unread badge (from notifications slice), wishlist badge (from wishlist slice), cart badge (from cart slice)
    - _Requirements: 2.1, 9.1, 9.2_
  - [x] 18.2 Extend `src/components/ProductCard.tsx` — add wishlist toggle button that dispatches to wishlist slice; show "Out of Stock" overlay when stock = 0
    - _Requirements: 3.9, 4.2, 4.3_
  - [x] 18.3 Create `src/components/NotificationPanel.tsx` — dropdown from bell icon; renders notification list; on open dispatches mark-all-read to API and slice
    - _Requirements: 9.1, 9.3_
  - [x] 18.4 Create `src/components/CheckoutStepper.tsx` — 4-step progress indicator (Address → Delivery → Payment → Review)
    - _Requirements: 6.2_
  - [x] 18.5 Create `src/components/AdminDataTable.tsx` — reusable sortable/filterable table with pagination for admin pages
    - _Requirements: 12.1, 13.1_
  - [x] 18.6 Create `src/components/RevenueChart.tsx` — Recharts `LineChart` rendering daily revenue data points
    - _Requirements: 14.2_
  - [x] 18.7 Create `src/components/InvoiceDownloadButton.tsx` — calls `GET /api/invoices/[orderId]`; shows loading state; triggers PDF download
    - _Requirements: 8.2, 8.3_
  - [x] 18.8 Extend `src/components/CartItem.tsx` — add out-of-stock warning banner when item's inventory is 0
    - _Requirements: 5.8_

- [x] 19. Home page (`src/app/page.tsx`)
  - [x] 19.1 Implement hero banner section with headline, subheading, and CTA button linking to `/products`
    - _Requirements: 2.2_
  - [x] 19.2 Implement "New Arrivals" section — fetch 8 most recent active products server-side, render in responsive grid
    - _Requirements: 2.3_
  - [x] 19.3 Implement Category sections (Casual Wear, Special Wear) — fetch products by category, render grid with "View All" link
    - _Requirements: 2.4_
  - [x] 19.4 Implement "Featured / Trending" section — fetch products where `featured = true`
    - _Requirements: 2.5_
  - [x] 19.5 Implement testimonials section — render at least 3 static review cards with name, rating, and text
    - _Requirements: 2.6_
  - [x] 19.6 Implement footer with nav links, social links, newsletter input, and copyright
    - _Requirements: 2.7_

- [x] 20. Products listing page (`src/app/products/page.tsx`)
  - [x] 20.1 Implement filter sidebar — category, size, color checkboxes and price range slider; dispatch to products slice on change
    - _Requirements: 3.3, 3.4_
  - [x] 20.2 Implement sort dropdown — Newest, Price Low-High, Price High-Low, Best Selling; dispatch to products slice
    - _Requirements: 3.5, 3.6_
  - [x] 20.3 Implement paginated product grid — 12 per page, fetch from `/api/products` with current slice state as query params
    - _Requirements: 3.1_
  - [x] 20.4 Wire `SearchBar` component — debounced 500ms, dispatches search query to products slice
    - _Requirements: 3.2_

- [x] 21. Product detail page (`src/app/products/[id]/page.tsx`)
  - [x] 21.1 Render product images with zoom-on-hover; display title, price, description
    - _Requirements: 3.7_
  - [x] 21.2 Implement variant selector (size + color buttons) — on selection fetch inventory for that variant and update displayed stock status
    - _Requirements: 3.8, 3.9_
  - [x] 21.3 Wire "Add to Cart" button — disabled when selected variant stock = 0; dispatches to cart slice
    - _Requirements: 3.9, 5.2_
  - [x] 21.4 Wire wishlist toggle button — dispatches to wishlist slice
    - _Requirements: 4.2_

- [x] 22. Cart page (`src/app/cart/page.tsx`)
  - [x] 22.1 Render cart items using extended `CartItem` component; wire quantity controls and remove button to cart slice
    - _Requirements: 5.3, 5.4_
  - [x] 22.2 Render order summary — subtotal, taxes, shipping, discount line, total from cart slice
    - _Requirements: 5.5_
  - [x] 22.3 Implement discount code input — calls `/api/cart/discount`, shows success/error message
    - _Requirements: 5.6, 5.7_
  - [x] 22.4 Disable checkout button when any cart item has zero inventory
    - _Requirements: 5.8_

- [x] 23. Checkout page (`src/app/checkout/page.tsx`)
  - [x] 23.1 Implement Step 1 — Shipping Address form with validation (fullName, addressLine1, city, postalCode, country required)
    - _Requirements: 6.2, 6.3_
  - [x] 23.2 Implement Step 2 — Delivery Method selection
    - _Requirements: 6.2_
  - [x] 23.3 Implement Step 3 — Payment using Stripe Elements; call `/api/checkout/session` for `clientSecret`; display Stripe validation errors
    - _Requirements: 6.4_
  - [x] 23.4 Implement Step 4 — Order Review; on confirm call `/api/checkout/confirm`; handle success (redirect to order detail) and failure (show error, preserve cart)
    - _Requirements: 6.5, 6.6_

- [x] 24. Orders pages
  - [x] 24.1 Implement `src/app/orders/page.tsx` — fetch shopper's orders server-side sorted by `createdAt` desc; render list with order ID, date, item count, total, status
    - _Requirements: 7.1, 7.2_
  - [x] 24.2 Implement `src/app/orders/[id]/page.tsx` — render order items, shipping address, delivery method, payment summary, status timeline; include `InvoiceDownloadButton`
    - _Requirements: 7.3, 7.6, 8.2_

- [x] 25. Wishlist page (`src/app/wishlist/page.tsx`)
  - [x] 25.1 Render wishlist items with current price, stock status, and "Add to Cart" button; wire remove button to wishlist slice
    - _Requirements: 4.4, 4.5_

- [x] 26. Auth pages
  - [x] 26.1 Implement `src/app/signup/page.tsx` — form calling `/api/auth/register`; show inline validation errors
    - _Requirements: 1.1, 1.2_
  - [x] 26.2 Implement `src/app/login/page.tsx` — credentials form + Google OAuth button via NextAuth `signIn`; show generic error on failure; redirect to `callbackUrl`
    - _Requirements: 1.3, 1.4, 1.7_
  - [x] 26.3 Implement `src/app/reset-password/page.tsx` (request form) and `src/app/reset-password/confirm/page.tsx` (new password form)
    - _Requirements: 1.5_
  - [x] 26.4 Create `src/app/suspended/page.tsx` — shown to suspended users after middleware redirect
    - _Requirements: 13.2_

- [x] 27. Checkpoint — Ensure all shopper-facing pages render correctly and slice integrations work; ask the user if questions arise.

- [x] 28. Admin — Products page (`src/app/admin/products/page.tsx`)
  - [x] 28.1 Implement product list using `AdminDataTable`; add inline edit form for updating product fields
    - _Requirements: 10.5_
  - [x] 28.2 Implement product creation form — title, description, price, category, sizes (multi-select), colors (multi-select), featured flag, image upload (up to 6 files, JPEG/PNG, <5MB each); calls `POST /api/products` then `POST /api/products/[id]/images`
    - _Requirements: 10.2, 10.3, 10.4_
  - [x] 28.3 Implement soft-delete button — calls `DELETE /api/products/[id]`; removes product from list
    - _Requirements: 10.6_
  - [x] 28.4 Implement image management panel — reorder, replace, remove individual images for existing product
    - _Requirements: 10.7_

- [x] 29. Admin — Inventory page (`src/app/admin/inventory/page.tsx`)
  - [x] 29.1 Render inventory table with all variants; highlight rows where stock = 0; inline stock count editor calling `PUT /api/inventory/[variantId]`
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 29.2 Implement CSV import UI — file input, submit calls `POST /api/inventory/import`, display row-level error report
    - _Requirements: 11.5, 11.6_

- [x] 30. Admin — Orders page (`src/app/admin/orders/page.tsx`)
  - [x] 30.1 Render orders list using `AdminDataTable` with status/date/name filters; wire filter controls to API query params
    - _Requirements: 12.1, 12.2_
  - [x] 30.2 Implement status update control — dropdown with valid next statuses; require tracking number + carrier input when selecting "Shipped"; calls `PUT /api/orders/[id]/status`
    - _Requirements: 12.3, 12.4_
  - [x] 30.3 Implement "Export CSV" button — calls `GET /api/orders/export` with current filters; triggers file download
    - _Requirements: 12.6_
  - [x] 30.4 Link to order detail page showing `InvoiceDownloadButton` for admin
    - _Requirements: 12.5_

- [x] 31. Admin — Users page (`src/app/admin/users/page.tsx`)
  - [x] 31.1 Render user list using `AdminDataTable` with name, email, registration date, order count, status columns
    - _Requirements: 13.1_
  - [x] 31.2 Implement suspend/reinstate buttons — call respective API routes; disable both buttons when viewing own account
    - _Requirements: 13.2, 13.3, 13.5_
  - [x] 31.3 Implement user profile view showing full order history
    - _Requirements: 13.4_

- [x] 32. Admin — Dashboard page (`src/app/admin/dashboard/page.tsx`)
  - [x] 32.1 Fetch and display metric cards — total revenue (current month), total orders (current month), new shoppers (current month), top-5 best-selling products; data from `GET /api/admin/dashboard`
    - _Requirements: 14.1_
  - [x] 32.2 Render `RevenueChart` with daily revenue data for past 30 days
    - _Requirements: 14.2_
  - [x] 32.3 Render recent orders widget — 10 most recent orders with status
    - _Requirements: 14.3_
  - [x] 32.4 Implement auto-refresh — poll `GET /api/admin/dashboard` every 5 minutes using `setInterval` in a `useEffect`
    - _Requirements: 14.5_

- [x] 33. Final checkpoint — Ensure all tests pass and all pages are wired end-to-end; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations, tagged `// Feature: tshirt-ecommerce-platform, Property N: <text>`
- Checkpoints at tasks 5, 16, 27, and 33 ensure incremental validation
- All monetary values are stored and computed in cents to avoid floating-point issues
