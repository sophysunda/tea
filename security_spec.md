# Security Specification for Qingfeng Soft Drink System

## Data Invariants
1. **Category Consistency**: Every category must have a `name` (string, 1-100 chars) and `order` (number, non-negative).
2. **Product Validity**: Every product must reference a valid `categoryId`. `prices` must contain `M` or `L` with values >= 0.
3. **Order Integrity**: Orders must contain at least one item. `totalAmount` must be the sum of items. `status` must be `pending`, `preparing`, `ready`, `completed`, or `cancelled`.
4. **Identity & Access**: 
    - `categories` and `products` are publicly readable but only admin-writable.
    - `orders` can be created by any user (public) but only admins can list/update/delete them.

## The Dirty Dozen Payloads (Targeting Firestore Rules)

### 1. The Shadow Field Attack (Product)
```json
{
  "name": "Evil Tea",
  "categoryId": "cat123",
  "prices": { "M": 20 },
  "isVerified": true,
  "hiddenDiscount": 99
}
```
*Goal: Inject extra fields into product documents.*

### 2. Orphaned Write (Product)
```json
{
  "name": "Ghost Tea",
  "categoryId": "non-existent-category-id",
  "prices": { "M": 20 }
}
```
*Goal: Reference a category that doesn't exist.*

### 3. Price Poisoning (Product)
```json
{
  "name": "Free Tea",
  "categoryId": "cat123",
  "prices": { "M": -100 }
}
```
*Goal: Set a negative price.*

### 4. Admin Role Spoofing (Order)
```json
{
  "totalAmount": 100,
  "status": "completed",
  "isAdminOrder": true
}
```
*Goal: Create an order with pre-completed status.*

### 5. Status Jump (Order Update)
```json
{
  "status": "completed"
}
```
*Goal: Change status from 'pending' directly to 'completed' by a non-admin.*

### 6. Mass Deletion (Category)
*Goal: Delete a category as a regular user.*

### 7. Resource Exhaustion (Order ID)
*Goal: Create an order with a 1MB string as a field value.*

### 8. Unauthorized Query Scraper (Order List)
*Goal: List all orders as a non-authenticated user.*

### 9. PII Leak (Order Get)
*Goal: Read another customer's order details without being an admin.*

### 10. Immutable Field Modification (Order)
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Goal: Change the createdAt timestamp of an existing order.*

### 11. Type Mismatch (Category)
```json
{
  "name": 12345,
  "order": "first"
}
```
*Goal: Break the schema with incorrect types.*

### 12. Empty Order
```json
{
  "items": [],
  "totalAmount": 0,
  "status": "pending"
}
```
*Goal: Create an order with no content.*

## The Test Runner (Plan)
We will implement `firestore.rules` and verify it against these scenarios.
Since we don't have a local emulator runner here, we will rely on the "Red Team Audit" logic.
