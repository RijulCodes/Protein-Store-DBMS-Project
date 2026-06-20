# DBS Lab Final Project: Protein Store

A database-driven protein store management system built as a final project for my Database Systems lab.

## Features

* Product listing
* Order management
* Admin dashboard
* Order history
* Sales statistics

## Tech Stack

* MySQL
* Node.js / Express (if applicable)
* HTML/CSS/JS

## User View Screenshots
<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/7ec5a06b-5c7e-46c7-a951-b830015e0d8b" width="100%"/></td>
    <td><img src="https://github.com/user-attachments/assets/ed9e8b71-baac-4413-89b5-7910f03104bb" width="100%"/></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/989acfbe-77d4-4eee-9d3a-a65286359631" width="100%"/></td>
    <td><img src="https://github.com/user-attachments/assets/a8bbb475-043e-4127-880e-564fcc8d43f9" width="100%"/></td>
  </tr>
  
</table>


## Admin View Screenshots
<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/12c6f88b-03e3-4dcf-b8d3-e424fa3b698e" width="100%"/></td>
    <td><img src="https://github.com/user-attachments/assets/86260086-3489-4235-acb7-c4adbdcce923" width="100%"/></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/add1946d-64b6-47cb-9550-16f49b669b44" width="100%"/></td>
    <td><img src="https://github.com/user-attachments/assets/9531db7d-6d6b-45d1-bc6a-8745f32af693" width="100%"/></td>
/>

    
  </tr>
  
</table>

## Database Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    Users {
        int user_id PK
        string name
        string email
        string password
        enum role
        timestamp created_at
    }
    Products {
        int product_id PK
        string name
        string category
        string description
        decimal price
        int stock
        boolean in_stock
        boolean low_stock
        string image_url
        timestamp created_at
    }
    Cart {
        int cart_id PK
        int user_id FK
        timestamp created_at
    }
    Cart_Items {
        int cart_item_id PK
        int cart_id FK
        int product_id FK
        int quantity
    }
    Orders {
        int order_id PK
        int user_id FK
        decimal total_amount
        enum status
        timestamp created_at
    }
    Order_Items {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal price
    }
    Payments {
        int payment_id PK
        int order_id FK
        decimal amount
        string payment_method
        enum status
        timestamp paid_at
    }
    Users ||--o| Cart : has
    Users ||--o{ Orders : places
    Cart ||--o{ Cart_Items : contains
    Products ||--o{ Cart_Items : in
    Orders ||--o{ Order_Items : includes
    Products ||--o{ Order_Items : in
    Orders ||--o| Payments : has
```

---

## How to Run

### 1. Local Setup
1. **Clone the repository.**
2. **Setup the Database:**
   * Import the MySQL schema:
     ```bash
     mysql -u root -p < schema.sql
     ```
   * To enable the **AI Analytics Console (Phase 2c)** securely, connect to MySQL as root and execute the read-only grants:
     ```sql
     CREATE USER 'reporter_user'@'localhost' IDENTIFIED BY '<use-a-strong-custom-password-here>';
     GRANT SELECT ON protein_store.Products TO 'reporter_user'@'localhost';
     GRANT SELECT ON protein_store.Orders TO 'reporter_user'@'localhost';
     GRANT SELECT ON protein_store.Order_Items TO 'reporter_user'@'localhost';
     GRANT SELECT ON protein_store.Payments TO 'reporter_user'@'localhost';
     GRANT SELECT ON protein_store.vw_product_stock_status TO 'reporter_user'@'localhost';
     GRANT SELECT ON protein_store.vw_order_summary TO 'reporter_user'@'localhost';
     FLUSH PRIVILEGES;
     ```
3. **Configure Environment Variables:**
   * Create or update `backend/.env` file with these keys:
     ```ini
     PORT=5000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_mysql_root_password
     DB_NAME=protein_store
     JWT_SECRET=supersecretjwtkey123!
     
     # AI Integrations (Get a free key from Google AI Studio)
     GEMINI_API_KEY=your_gemini_api_key_here
     
     # Secure read-only reporter user (Phase 2c)
     REPORTER_DB_USER=reporter_user
     REPORTER_DB_PASSWORD=your_reporter_password_here
     ```
4. **Run Backend Server:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
5. **Run Frontend Development Server:**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 2. Run with Docker
If you have Docker and Docker Compose installed, run the entire stack (Database, Backend API, React Frontend) in one command:
```bash
# Provide your Gemini key in the environment or .env
docker-compose up --build
```
The database will automatically initialize itself with the sample products and schema.

---

## Running Integration Tests
To run HTTP-level backend integration tests verifying standard endpoints:
```bash
cd backend
npm run test
```

## Authors

* Rijul Yadav
* Nitya Mehrotra
* Divit Khandelwal

