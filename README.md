# AasaMedChem Inventory & Order Management System

A premium, high-precision inventory control and quotation system designed using **Next.js (App Router)**, **Prisma ORM with PostgreSQL**, and **Vanilla CSS**. This system is specifically built to manage chemical and biological products across multiple physical dimensions (Weight, Volume, Count) with high decimal precision, real-time unit conversions, and role-based access control (Admin/Seller).

---

## 🌟 Key Features
- **High-Precision Architecture**: Numeric fields (prices, stock, orders, conversion ratios) utilize PostgreSQL `DECIMAL(20, 8)` to eliminate floating-point rounding errors.
- **Dynamic Unit Conversions**: Seamlessly convert weights (`g` <-> `kg`), volumes (`mL` <-> `L`), and count (`item`) in both the frontend and backend.
- **Role-Based Routing (Admin / Seller)**:
  - **Admin Panel**: Complete Product CRUD, stock level monitoring (with low stock warnings), and a detailed order approval workspace showing full conversion math.
  - **Seller Portal**: Catalog search/filters, interactive order sheet with reactive unit-switching cart, and order status tracker.
- **Modern Dark Aesthetics**: Premium glassmorphic look using CSS variables, outfit typography, glowing hover micro-animations, and responsive layout grids.
- **Secure Authentication**: Zero-dependency native password hashing (SHA-256) and secure cookie JWT session middleware.

---

## 📐 System Design & Data Flow

```mermaid
graph TD
  User(Client Browser) -->|HTTP Request / Cookies| Middleware{Next.js Middleware}
  Middleware -->|Auth Valid| Route[Server Action / Page]
  Middleware -->|Unauth| Login[/login]
  Route -->|Database Read/Write| DB[(Neon PostgreSQL)]
```

### High-Level Interactivity
1. **Interactive Cart Sheet**: The Seller adds a product to the cart and selects their preferred unit (e.g. `kg` instead of base unit `g`). The client-side calculates the unit price and subtotal instantly using `decimal.js`.
2. **Order Dispatch**: When the Seller checks out, the exact ordered quantity and unit are sent to a Next.js Server Action.
3. **Backend Conversion**: The server retrieves the base product, recalculates the conversion factor, registers the items, and computes the absolute base quantity in database units.
4. **Admin Approval & Stock Deduction**: The Admin reviews the quotation. On approval, the database runs a transactional stock audit to ensure availability, decrements the inventory in base units, and marks the quotation as `APPROVED`.

---

## 💾 Database Schema

Prisma models mapped to PostgreSQL types.

### `User` Table
Stores authentication details and roles.
- `id` (String, UUID, Primary Key)
- `email` (String, Unique)
- `name` (String)
- `passwordHash` (String, SHA-256 hex string)
- `role` (String, `"ADMIN"` or `"SELLER"`)
- `createdAt` (DateTime)

### `Product` Table
Stores product details and inventory levels.
- `id` (String, UUID, Primary Key)
- `sku` (String, Unique SKU identifier)
- `name` (String)
- `description` (String, Nullable)
- `category` (String)
- `dimension` (String, `"WEIGHT"` | `"VOLUME"` | `"COUNT"`)
- `baseUnit` (String, `"g"` | `"mL"` | `"item"`)
- `pricePerBaseUnit` (Decimal, `db.Decimal(20, 8)`) - Unit price in INR for 1 base unit
- `stockQuantity` (Decimal, `db.Decimal(20, 8)`) - Remaining stock in terms of the base unit
- `createdAt` / `updatedAt` (DateTime)

### `Order` Table
Quotation record tracking.
- `id` (String, UUID, Primary Key)
- `sellerId` (String, Foreign Key to User)
- `status` (String, default `"PENDING"`, can be `"APPROVED"` or `"REJECTED"`)
- `totalPrice` (Decimal, `db.Decimal(20, 8)`) - Total quotation value in INR
- `createdAt` / `updatedAt` (DateTime)

### `OrderItem` Table
Individual line items inside an order.
- `id` (String, UUID, Primary Key)
- `orderId` (String, Foreign Key to Order)
- `productId` (String, Foreign Key to Product)
- `orderedQuantity` (Decimal, `db.Decimal(20, 8)`) - Quantity in user-selected unit
- `orderedUnit` (String, selected unit like `"kg"`, `"L"`, etc.)
- `baseQuantity` (Decimal, `db.Decimal(20, 8)`) - Quantity converted to the base unit for inventory checks
- `pricePerUnit` (Decimal, `db.Decimal(20, 8)`) - Rate in INR per selected unit at checkout
- `subtotal` (Decimal, `db.Decimal(20, 8)`) - Item price in INR

---

## 🧮 Unit Storage & Conversion Strategy

To maintain database consistency and high decimal precision:

### 1. Dimension-Base Standards
- All Weights are stored in **Grams (`g`)**.
- All Volumes are stored in **Milliliters (`mL`)**.
- All Counts are stored in **Items (`item`)**.

This provides a single source of truth for stock quantities and prices.

### 2. Conversions
- **Weight**: 
  - $1 \text{ kg} = 1000 \text{ g}$
  - Conversion factor = $1000$.
- **Volume**: 
  - $1 \text{ L} = 1000 \text{ mL}$
  - Conversion factor = $1000$.
- **Count**: 
  - $1 \text{ item} = 1 \text{ item}$
  - Conversion factor = $1$.

### 3. Application Rules
- **Price Calculation**: $\text{Price per selected unit} = \text{Price per base unit} \times \text{Conversion factor}$.
  - E.g. If Sodium Hydroxide costs ₹0.80/g, then the price per kg is ₹`0.80 * 1000 = 800` INR/kg.
- **Stock Calculations**: $\text{Quantity in base unit} = \text{Ordered quantity} \times \text{Conversion factor}$.
  - E.g. Ordering 2.5 kg translates to $2.5 \times 1000 = 2500$ grams. Stock checks and deductions are verified against this value.

---

## 🚀 Local Setup & Seeding

### Prerequisites
- Node.js (v18+)
- Local PostgreSQL instance or a free Neon database connection URL.

### 1. Installation
Clone the repository, navigate into it, and install dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root of the project:
```env
DATABASE_URL="postgresql://user:password@hostname:5432/dbname?sslmode=require"
JWT_SECRET="make-this-a-very-long-secure-random-phrase-key"
```

### 3. Database Sync & Generate Client
Generate Prisma Client:
```bash
npx prisma generate
```

Run database migrations to initialize tables in your PostgreSQL database:
```bash
npx prisma db push
```

### 4. Database Seeding
Seed the database with pre-configured admin and seller accounts, along with catalog chemicals:
```bash
npx prisma db seed
```

### 5. Running the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Credentials for Evaluation

Use these seeded accounts to test different roles:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@aasamedchem.com` | `admin123` |
| **Seller** | `seller@aasamedchem.com` | `seller123` |

---

## 🛫 Deploying to Vercel

To deploy this project to Vercel:

1. Push the code repository to GitHub/GitLab.
2. In the Vercel dashboard, click **Add New Project** and import the repository.
3. Configure the environment variables in Vercel:
   - `DATABASE_URL` (your Neon database URL)
   - `JWT_SECRET` (your JWT secret string)
4. Click **Deploy**. Vercel will automatically run `prisma generate` during build and compile Next.js server actions.
