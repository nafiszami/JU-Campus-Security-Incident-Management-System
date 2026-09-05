# JU Campus Security and Incident Management System (JU-CSIMS)

A comprehensive, role-based web application designed to manage campus security, track incidents, register visitors, and monitor guard attendance at Jahangirnagar University.

## Tech Stack

- **Frontend:** React.js, React Router DOM
- **Backend:** Node.js, Express.js
- **Database:** MySQL 8+
- **Testing:** Jest, Supertest

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL](https://www.mysql.com/) (v8.0 or higher)
- Git

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd JU-CSIMS
```

### 2. Database Configuration

The database schema is located at:

```text
server/database/schema.sql
```

The schema contains the command to create the `ju_csims` database.

#### Using MySQL CLI

From the project root, run:

```bash
mysql -u root -p < server/database/schema.sql
```

Enter your MySQL password when prompted.

#### Using MySQL Workbench

1. Open MySQL Workbench.
2. Open `server/database/schema.sql`.
3. Execute the SQL script.
4. Verify that the `ju_csims` database has been created.

---

### 3. Backend Setup

Navigate to the `server` directory:

```bash
cd server
```

Install the required dependencies:

```bash
npm install
```

Create a `.env` file inside the `server` directory:

```text
server/.env
```

Add the following configuration:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ju_csims

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=8h
```

Start the backend development server:

```bash
npm run dev
```

The backend API will run at:

```text
http://localhost:5000
```

---

### 4. Frontend Setup

Open a **new terminal** and navigate to the `client` directory:

```bash
cd client
```

Install the frontend dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm start
```

The frontend will run at:

```text
http://localhost:3000
```

---

## Running the Application

Run the backend and frontend in separate terminals.

### Terminal 1 — Backend

```bash
cd server
npm run dev
```

### Terminal 2 — Frontend

```bash
cd client
npm start
```

Open the application in your browser:

```text
http://localhost:3000
```

---

## Running Tests

The backend uses **Jest** and **Supertest** for automated testing.

Navigate to the server directory:

```bash
cd server
```

Run the test suite:

```bash
npm test
```

---

## Default Test Accounts

The following pre-seeded accounts can be used to test authentication and role-based access control.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@juniv.edu` | `Password123` |
| Gate Operator | `gate@juniv.edu` | `Password123` |
| Student | `teststudent@juniv.edu` | `Password123` |

> These accounts are intended for local development and testing only.

---

## Environment Variables

| Variable | Example | Description |
|---|---|---|
| `PORT` | `5000` | Backend server port |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | `your_mysql_password` | MySQL password |
| `DB_NAME` | `ju_csims` | MySQL database name |
| `JWT_SECRET` | `your_super_secret_jwt_key` | Secret key for JWT authentication |
| `JWT_EXPIRES_IN` | `8h` | JWT token expiration time |

> **Important:** Never commit the `.env` file or real passwords/secrets to GitHub.

---

## Troubleshooting

### MySQL Connection Error

Check that:

- MySQL Server is running.
- The `ju_csims` database exists.
- The database credentials in `.env` are correct.
- The MySQL username and password are correct.

### Backend Does Not Start

Try reinstalling the backend dependencies:

```bash
cd server
npm install
npm run dev
```

Also verify that the `.env` file exists inside the `server` directory.

### Frontend Does Not Start

Try reinstalling the frontend dependencies:

```bash
cd client
npm install
npm start
```

### Port Already in Use

If port `5000` or `3000` is already being used, stop the process using that port or configure the application to use another available port.

---

## Security Notes

- Do not commit `.env` files to the repository.
- Do not use real passwords in test accounts.
- Keep the `JWT_SECRET` private.
- The default test accounts are intended only for development and testing.

---

## License

This project is developed for academic purposes as part of the Software Engineering & ISD Lab at the Department of Computer Science and Engineering, Jahangirnagar University.