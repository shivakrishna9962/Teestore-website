# Requirements Document

## Introduction

A full-featured T-shirt e-commerce platform built on an existing Next.js codebase. The platform serves two audiences: shoppers who browse, wishlist, purchase, and track T-shirt orders; and administrators who manage products, inventory, orders, and users. The UI follows a fashion e-commerce style with a hero banner, product grid, category sections, featured products, testimonials, and a footer — matching the provided screenshot reference.

---

## Glossary

- **Platform**: The full T-shirt e-commerce web application
- **Shopper**: An authenticated or guest user browsing and purchasing products
- **Admin**: An authenticated user with elevated privileges managing the Platform
- **Product**: A T-shirt listing with images, title, description, price, sizes, colors, and stock count
- **Cart**: A temporary collection of Products a Shopper intends to purchase
- **Wishlist**: A saved collection of Products a Shopper wants to revisit
- **Order**: A confirmed purchase containing one or more Products with a status lifecycle
- **Invoice**: A PDF document summarizing a completed Order
- **Notification**: An in-app or email message sent to a Shopper or Admin about Order or account events
- **Category**: A grouping of Products (e.g., Casual Wear, Special Wear, New Arrivals)
- **Inventory**: The stock count and availability state of each Product variant (size + color)
- **Auth_Service**: The authentication and session management subsystem
- **Product_Service**: The subsystem responsible for product data, search, and filtering
- **Cart_Service**: The subsystem managing Cart state and persistence
- **Wishlist_Service**: The subsystem managing Wishlist state and persistence
- **Order_Service**: The subsystem handling Order creation, status transitions, and history
- **Invoice_Service**: The subsystem that generates and delivers PDF Invoices
- **Notification_Service**: The subsystem that dispatches in-app and email Notifications
- **Admin_Panel**: The restricted interface used by Admins to manage the Platform
- **Payment_Gateway**: The external payment processing service integrated with the Platform

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a Shopper, I want to register, log in, and manage my account, so that my Cart, Wishlist, and Order history are saved and secure.

#### Acceptance Criteria

1. THE Auth_Service SHALL provide a registration flow accepting a unique email address, a display name, and a password of at least 8 characters.
2. WHEN a Shopper submits a registration form with a duplicate email address, THE Auth_Service SHALL return a descriptive error message without creating a new account.
3. WHEN a Shopper submits valid credentials on the login page, THE Auth_Service SHALL issue a session token and redirect the Shopper to the previously visited page or the home page.
4. WHEN a Shopper submits invalid credentials on the login page, THE Auth_Service SHALL return an error message within 2 seconds without revealing which field is incorrect.
5. WHEN a Shopper requests a password reset, THE Auth_Service SHALL send a time-limited reset link to the registered email address within 60 seconds.
6. WHEN a Shopper's session token expires, THE Auth_Service SHALL redirect the Shopper to the login page and preserve the intended destination URL.
7. THE Auth_Service SHALL support OAuth sign-in via Google as an optional authentication method.
8. WHEN a Shopper logs out, THE Auth_Service SHALL invalidate the session token and clear all session data from the browser.

---

### Requirement 2: Home Page and UI Layout

**User Story:** As a Shopper, I want a visually engaging home page matching the fashion e-commerce style, so that I can quickly discover products and navigate the Platform.

#### Acceptance Criteria

1. THE Platform SHALL render a top navigation bar containing the site logo, primary category links, a search input, a Cart icon with item count badge, a Wishlist icon with item count badge, and account access controls.
2. THE Platform SHALL render a full-width hero banner section with promotional headline text, a subheading, and a call-to-action button linking to the products page.
3. THE Platform SHALL render a "New Arrivals" section displaying the 8 most recently added Products in a responsive grid.
4. THE Platform SHALL render at least two Category sections (Casual Wear and Special Wear) each displaying a curated set of Products with a "View All" link.
5. THE Platform SHALL render a "Featured / Trending" section displaying Products marked as featured by an Admin.
6. THE Platform SHALL render a customer testimonials section displaying at least 3 review cards with reviewer name, rating, and review text.
7. THE Platform SHALL render a footer containing navigation links, social media links, a newsletter subscription input, and copyright information.
8. WHILE a page is loading data, THE Platform SHALL display a loading indicator in place of the content area.
9. THE Platform SHALL be fully responsive, rendering correctly on viewport widths from 320px to 1920px.

---

### Requirement 3: Product Browsing, Search, and Filtering

**User Story:** As a Shopper, I want to browse, search, and filter T-shirts, so that I can find products that match my preferences quickly.

#### Acceptance Criteria

1. THE Product_Service SHALL provide a products listing page displaying all active Products in a paginated grid of 12 Products per page.
2. WHEN a Shopper enters a search query of at least 2 characters, THE Product_Service SHALL return matching Products filtered by title, description, or category within 500ms.
3. THE Product_Service SHALL provide filter controls for Category, size, color, and price range on the products listing page.
4. WHEN a Shopper applies one or more filters, THE Product_Service SHALL update the product grid to show only Products matching all selected filter criteria.
5. THE Product_Service SHALL provide sort options: Newest, Price Low to High, Price High to Low, and Best Selling.
6. WHEN a Shopper selects a sort option, THE Product_Service SHALL re-order the product grid accordingly without a full page reload.
7. THE Product_Service SHALL provide a product detail page for each Product displaying all images (with zoom on hover), title, price, available sizes, available colors, stock status, and description.
8. WHEN a Shopper selects a size or color on the product detail page, THE Product_Service SHALL update the displayed stock status to reflect the selected variant's Inventory.
9. IF a Product variant has zero stock, THEN THE Product_Service SHALL display an "Out of Stock" label and disable the "Add to Cart" button for that variant.

---

### Requirement 4: Wishlist

**User Story:** As a Shopper, I want to save products to a Wishlist, so that I can revisit and purchase them later.

#### Acceptance Criteria

1. THE Wishlist_Service SHALL persist a Shopper's Wishlist across sessions when the Shopper is authenticated.
2. WHEN an authenticated Shopper clicks the wishlist icon on a Product card or detail page, THE Wishlist_Service SHALL add the Product to the Shopper's Wishlist and update the Wishlist icon badge count.
3. WHEN a Shopper clicks the wishlist icon on a Product already in the Wishlist, THE Wishlist_Service SHALL remove the Product from the Wishlist and update the badge count.
4. THE Wishlist_Service SHALL provide a dedicated Wishlist page listing all saved Products with their current price, stock status, and an "Add to Cart" button.
5. WHEN an authenticated Shopper adds a Wishlist item to the Cart, THE Wishlist_Service SHALL retain the item in the Wishlist unless the Shopper explicitly removes it.
6. IF a Shopper attempts to access the Wishlist page without being authenticated, THEN THE Auth_Service SHALL redirect the Shopper to the login page.

---

### Requirement 5: Shopping Cart

**User Story:** As a Shopper, I want to manage a shopping cart, so that I can review and adjust my selections before checkout.

#### Acceptance Criteria

1. THE Cart_Service SHALL persist Cart contents for authenticated Shoppers across sessions.
2. WHEN a Shopper adds a Product variant to the Cart, THE Cart_Service SHALL add the item with a quantity of 1 if not already present, or increment the quantity by 1 if already present.
3. WHEN a Shopper updates the quantity of a Cart item to zero, THE Cart_Service SHALL remove that item from the Cart.
4. THE Cart_Service SHALL display a Cart summary showing each item's image, name, selected size, selected color, unit price, quantity, and line total.
5. THE Cart_Service SHALL display the Cart subtotal, applicable taxes, estimated shipping cost, and order total.
6. WHEN a Shopper applies a valid discount code, THE Cart_Service SHALL deduct the corresponding discount amount from the order total and display the applied discount line.
7. IF a Shopper applies an invalid or expired discount code, THEN THE Cart_Service SHALL display an error message and leave the order total unchanged.
8. WHEN a Cart item's Inventory drops to zero after the item was added to the Cart, THE Cart_Service SHALL display a warning on that Cart item and disable the checkout button until the item is removed or its quantity is adjusted.

---

### Requirement 6: Checkout and Order Placement

**User Story:** As a Shopper, I want to complete a checkout process, so that I can place and pay for my order securely.

#### Acceptance Criteria

1. THE Order_Service SHALL require an authenticated Shopper session before allowing checkout to proceed.
2. THE Order_Service SHALL present a multi-step checkout flow: (1) Shipping Address, (2) Delivery Method, (3) Payment, (4) Order Review.
3. WHEN a Shopper submits a shipping address, THE Order_Service SHALL validate that all required fields (full name, address line 1, city, postal code, country) are present and non-empty.
4. THE Order_Service SHALL integrate with the Payment_Gateway to process card payments and display real-time validation errors returned by the Payment_Gateway.
5. WHEN the Payment_Gateway confirms a successful payment, THE Order_Service SHALL create an Order record with status "Confirmed", decrement Inventory for each purchased variant, and clear the Shopper's Cart.
6. IF the Payment_Gateway returns a payment failure, THEN THE Order_Service SHALL display the failure reason to the Shopper and retain the Cart contents.
7. WHEN an Order is confirmed, THE Notification_Service SHALL send an order confirmation email to the Shopper's registered email address within 60 seconds.
8. WHEN an Order is confirmed, THE Invoice_Service SHALL generate a PDF Invoice and attach it to the confirmation email.

---

### Requirement 7: Order Tracking

**User Story:** As a Shopper, I want to view and track my orders, so that I know the current status and expected delivery of each purchase.

#### Acceptance Criteria

1. THE Order_Service SHALL provide an order history page listing all Orders for the authenticated Shopper, sorted by most recent first.
2. THE Order_Service SHALL display each Order with its order ID, placement date, item count, total amount, and current status.
3. THE Order_Service SHALL provide an order detail page showing all Order items, shipping address, delivery method, payment summary, and a status timeline.
4. THE Order_Service SHALL support the following Order status values in sequence: Confirmed → Processing → Shipped → Out for Delivery → Delivered.
5. WHEN an Order's status changes, THE Notification_Service SHALL send an in-app notification and an email to the Shopper within 60 seconds of the status change.
6. WHEN an Order reaches "Shipped" status, THE Order_Service SHALL display a tracking number and carrier name on the order detail page.
7. IF a Shopper attempts to view an Order that does not belong to their account, THEN THE Order_Service SHALL return a 404 response.

---

### Requirement 8: Invoice Generation

**User Story:** As a Shopper, I want to download an invoice for my order, so that I have a record for personal or business use.

#### Acceptance Criteria

1. THE Invoice_Service SHALL generate a PDF Invoice for every confirmed Order containing: invoice number, issue date, Shopper name and address, itemized list of Products with quantities and prices, subtotal, taxes, shipping cost, discounts, and total amount paid.
2. THE Invoice_Service SHALL make the PDF Invoice available for download from the order detail page.
3. WHEN a Shopper requests an Invoice download, THE Invoice_Service SHALL serve the PDF file within 3 seconds.
4. THE Invoice_Service SHALL assign a unique, sequential invoice number to each Invoice.
5. IF an Invoice has not yet been generated for an Order, THEN THE Invoice_Service SHALL generate it on demand when the Shopper first requests the download.

---

### Requirement 9: Notifications

**User Story:** As a Shopper, I want to receive timely notifications about my orders and account, so that I stay informed without having to manually check the Platform.

#### Acceptance Criteria

1. THE Notification_Service SHALL deliver in-app notifications visible in a notification bell icon in the navigation bar.
2. WHEN a Shopper has unread notifications, THE Notification_Service SHALL display an unread count badge on the notification bell icon.
3. WHEN a Shopper opens the notification panel, THE Notification_Service SHALL mark all displayed notifications as read and remove the unread badge.
4. THE Notification_Service SHALL send email notifications for the following events: account registration, order confirmation, order status change, and password reset.
5. THE Notification_Service SHALL retain in-app notifications for 30 days before automatic deletion.
6. WHERE a Shopper has opted out of marketing emails, THE Notification_Service SHALL suppress promotional email notifications while continuing to send transactional emails.

---

### Requirement 10: Admin Panel — Product Management

**User Story:** As an Admin, I want to create, edit, and delete T-shirt products, so that the product catalog stays accurate and up to date.

#### Acceptance Criteria

1. THE Admin_Panel SHALL restrict all admin routes to users with the Admin role, returning a 403 response for unauthorized access attempts.
2. THE Admin_Panel SHALL provide a product creation form accepting: title, description, price, Category, sizes (multi-select), colors (multi-select), product images (up to 6 files, each under 5MB, in JPEG or PNG format), and a featured flag.
3. WHEN an Admin submits a valid product creation form, THE Admin_Panel SHALL create the Product, initialize Inventory to zero for each size/color variant, and display the new Product in the product list.
4. WHEN an Admin submits a product creation form with missing required fields, THE Admin_Panel SHALL display inline validation errors and prevent submission.
5. THE Admin_Panel SHALL provide an inline product editing interface allowing Admins to update any Product field without navigating away from the product list.
6. WHEN an Admin deletes a Product, THE Admin_Panel SHALL soft-delete the Product (marking it inactive) rather than permanently removing it, and remove it from all Shopper-facing pages.
7. THE Admin_Panel SHALL provide a product image management interface allowing Admins to reorder, replace, or remove individual images for an existing Product.

---

### Requirement 11: Admin Panel — Inventory Management

**User Story:** As an Admin, I want to manage stock levels for each product variant, so that Shoppers see accurate availability and overselling is prevented.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display an inventory table listing every Product variant (size + color combination) with its current stock count.
2. WHEN an Admin updates the stock count for a variant, THE Admin_Panel SHALL save the new value and immediately reflect it on the Shopper-facing product detail page.
3. WHEN a variant's stock count reaches zero, THE Admin_Panel SHALL highlight the variant row in the inventory table as out of stock.
4. WHEN a variant's stock count falls below a configurable low-stock threshold (default: 5 units), THE Notification_Service SHALL send an in-app notification to all Admins.
5. THE Admin_Panel SHALL provide a bulk stock update interface allowing Admins to import stock counts via a CSV file.
6. WHEN an Admin imports a CSV file with invalid rows, THE Admin_Panel SHALL display a row-level error report and apply only the valid rows.

---

### Requirement 12: Admin Panel — Order Management

**User Story:** As an Admin, I want to view and manage all customer orders, so that I can fulfill, update, and resolve order issues efficiently.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide an orders list page displaying all Orders with columns for order ID, Shopper name, placement date, item count, total amount, and current status.
2. THE Admin_Panel SHALL support filtering the orders list by status, date range, and Shopper name or email.
3. WHEN an Admin updates an Order's status, THE Admin_Panel SHALL save the new status, trigger the Notification_Service to notify the Shopper, and log the status change with a timestamp and the Admin's user ID.
4. WHEN an Admin sets an Order's status to "Shipped", THE Admin_Panel SHALL require a tracking number and carrier name before saving.
5. THE Admin_Panel SHALL allow Admins to view the Invoice PDF for any Order from the order detail page.
6. THE Admin_Panel SHALL provide an order export function that downloads all filtered Orders as a CSV file.

---

### Requirement 13: Admin Panel — User Management

**User Story:** As an Admin, I want to view and manage Shopper accounts, so that I can handle support requests and enforce platform policies.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a user list page displaying all registered Shoppers with their name, email, registration date, order count, and account status (active/suspended).
2. WHEN an Admin suspends a Shopper account, THE Auth_Service SHALL invalidate all active sessions for that Shopper and prevent future logins until the account is reinstated.
3. WHEN an Admin reinstates a suspended Shopper account, THE Auth_Service SHALL allow the Shopper to log in again.
4. THE Admin_Panel SHALL display a Shopper's full order history when an Admin views that Shopper's profile.
5. THE Admin_Panel SHALL prevent an Admin from deleting or suspending their own account.

---

### Requirement 14: Admin Panel — Dashboard

**User Story:** As an Admin, I want a summary dashboard, so that I can monitor platform performance at a glance.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a dashboard with the following metrics: total revenue (current month), total orders (current month), new Shoppers registered (current month), and top 5 best-selling Products.
2. THE Admin_Panel SHALL display a revenue trend chart showing daily revenue for the past 30 days.
3. THE Admin_Panel SHALL display a recent orders widget listing the 10 most recent Orders with their status.
4. WHEN an Admin views the dashboard, THE Admin_Panel SHALL load all metrics within 3 seconds.
5. THE Admin_Panel SHALL refresh dashboard metrics automatically every 5 minutes while the Admin has the dashboard page open.
