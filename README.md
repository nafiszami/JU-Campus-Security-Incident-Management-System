# JU Campus Security and Incident Management System (JU-CSIMS)

A comprehensive, role-based web application designed to manage campus security, track incidents, register visitors, and monitor guard attendance at Jahangirnagar University.

## Tech Stack
* **Frontend:** React.js, React Router DOM
* **Backend:** Node.js, Express.js
* **Database:** MySQL 8+
* **Testing:** Jest, Supertest

## Prerequisites
Before you begin, ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v16 or higher)
* [MySQL](https://www.mysql.com/) (v8.0 or higher)

---

## Project Setup Instructions

### 1. Database Configuration
1. The provided SQL schema already contains the command to create the database (`ju_csims`).
2. Simply import the project schema by running the provided SQL script located at `server/database/schema.sql`.
   
   *(You can run this via your MySQL workbench, or via CLI: `mysql -u root -p < server/database/schema.sql`)*

### 2. Backend Setup
1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install the required Node dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `server` directory and configure it with your local MySQL credentials:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=ju_csims
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=8h
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *(The API will run on `http://localhost:5000`)*

### 3. Frontend Setup
1. Open a **new** terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```
   *(The UI will automatically open in your browser at `http://localhost:3000`)*

---

## Running Tests
To run the automated backend test suites (using Jest):
```bash
cd server
npm test
```

## Default Test Accounts
Use these pre-seeded accounts to test the Role-Based Access Control features:
* **Gate Operator:** `gate@juniv.edu` | Password: `Password123`
* **Admin:** `admin@juniv.edu` | Password: `Password123`
* **Student:** `teststudent@juniv.edu` | Password: `Password123`