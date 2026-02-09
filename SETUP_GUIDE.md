# Smart Expense Sharing System - Complete Setup Guide for Windows

## Prerequisites

Before starting, ensure you have the following installed:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **MySQL Server** - [Download here](https://dev.mysql.com/downloads/installer/)
3. **MongoDB** - [Download here](https://www.mongodb.com/try/download/community)
4. **Git** (already installed ✓)

---

## Step 1: MySQL Database Setup

### Option A: Using MySQL Command Line

1. Open MySQL Command Line Client or PowerShell and login:
```powershell
mysql -u root -p
```

2. Run the schema file:
```sql
source d:/Ongoing/dbms/Smart-Expense-Sharing-and-Settlement-System/backend/schema.sql
```

OR copy-paste the entire content of `backend/schema.sql` into MySQL command line.

### Option B: Using MySQL Workbench (Easier)

1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Click **File → Open SQL Script**
4. Navigate to `backend/schema.sql` and open it
5. Click the **Execute** button (lightning bolt icon)
6. Verify the database was created by running:
```sql
USE expense_tracker;
SHOW TABLES;
```

You should see 5 tables: users, groups_made, group_members, expenses, expense_splits

---

## Step 2: MongoDB Setup

### Start MongoDB Service

1. **If MongoDB is installed as a Windows Service:**
```powershell
net start MongoDB
```

2. **If MongoDB is NOT running as a service:**
   - Open PowerShell as Administrator
   - Navigate to MongoDB bin folder (typically):
```powershell
cd "C:\Program Files\MongoDB\Server\7.0\bin"
```
   - Start MongoDB:
```powershell
.\mongod.exe --dbpath "C:\data\db"
```

### Verify MongoDB is Running

Open a new PowerShell window:
```powershell
# Test connection
mongosh
# You should see MongoDB shell prompt
# Type 'exit' to quit
```

---

## Step 3: Configure Environment Variables

1. Open the file: `backend\.env`

2. **Update the following values:**

```env
# MySQL Configuration
PASSWORD=your_actual_mysql_root_password

# MongoDB Configuration (usually no changes needed for local)
MONGO_URI=mongodb://localhost:27017/

# JWT Secret (change this!)
JWT_SECRET=mySecretKey12345ChangeThisToSomethingRandom

# Email Configuration (Optional - for OTP features)
# You can skip this if you don't need email OTP functionality
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_email_app_password
```

**Important Notes:**
- Replace `your_actual_mysql_root_password` with your MySQL root password
- If you don't remember your MySQL password, you may need to reset it
- Email configuration is optional for basic functionality

---

## Step 4: Seed MongoDB with Sample Data (Optional)

This adds sample activity logs and settlement cache data:

```powershell
cd "d:\Ongoing\dbms\Smart-Expense-Sharing-and-Settlement-System\backend"
node seed_nosql_data.js
```

To verify the data was inserted:
```powershell
node verify_nosql.js
```

---

## Step 5: Run the Application

### Terminal 1: Start Backend Server

```powershell
cd "d:\Ongoing\dbms\Smart-Expense-Sharing-and-Settlement-System\backend"
npm start
```

You should see:
```
Connected to MySQL database!
MongoDB connected
Server listening on port 3000
```

### Terminal 2: Start Frontend Development Server

Open a **new PowerShell terminal** and run:

```powershell
cd "d:\Ongoing\dbms\Smart-Expense-Sharing-and-Settlement-System\frontend"
npm run dev
```

You should see:
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

---

## Step 6: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Test Login Credentials (from sample data):

- **Email:** john@example.com  
  **Password:** password (the hash in DB is for "password")

- **Email:** jane@example.com  
  **Password:** password

- **Email:** bob@example.com  
  **Password:** password

- **Email:** alice@example.com  
  **Password:** password

**Note:** All sample users have the password "password" (hashed with bcrypt)

---

## Troubleshooting

### MySQL Connection Issues

**Error: "Access denied for user 'root'@'localhost'"**
- Check your MySQL password in `.env`
- Verify MySQL service is running: `net start MySQL80` (version may vary)

**Error: "Unknown database 'expense_tracker'"**
- Run the schema.sql file again to create the database

### MongoDB Connection Issues

**Error: "MongoNetworkError"**
- Ensure MongoDB service is running
- Check if port 27017 is available
- Try: `net start MongoDB` in PowerShell as Administrator

### Port Already in Use

**Backend (Port 3000):**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Frontend (Port 5173):**
```powershell
# Find process using port 5173
netstat -ano | findstr :5173
# Kill the process
taskkill /PID <PID> /F
```

### Module Not Found Errors

```powershell
# Reinstall dependencies
cd backend
Remove-Item -Recurse -Force node_modules
npm install

cd ..\frontend
Remove-Item -Recurse -Force node_modules
npm install
```

---

## Project Structure Overview

```
Smart-Expense-Sharing-and-Settlement-System/
├── backend/                    # Express.js API server
│   ├── .env                   # Environment configuration (YOU NEED TO EDIT THIS!)
│   ├── schema.sql             # MySQL database schema (RUN THIS FIRST!)
│   ├── app.js                 # Express app setup
│   ├── db/                    # Database connections
│   ├── routes/                # API endpoints
│   ├── mongo/                 # MongoDB models
│   └── services/              # Business logic
├── frontend/                   # React + Vite frontend
│   ├── src/                   # React components
│   └── vite.config.js         # Vite configuration
└── docs/                      # Documentation
```

---

## API Endpoints (for reference)

### Authentication
- `POST /newuser` - Register new user
- `POST /loginuser` - User login
- `POST /api/auth/send-otp` - Send OTP (if email configured)

### Groups
- `GET /api/groups` - List user's groups
- `POST /api/groups` - Create new group
- `GET /api/groups/:id/members` - Get group members

### Expenses
- `POST /api/expenses` - Create new expense
- `GET /api/expenses/group/:id` - Get group expenses
- `POST /api/expenses/parse` - Parse natural language expense

### Dashboard
- `GET /api/user-dashboard` - Get user dashboard data

---

## Features

✅ User registration and authentication  
✅ Create and manage expense groups  
✅ Add members to groups  
✅ Record expenses and split them equally  
✅ View balances and settlement calculations  
✅ Real-time updates using Socket.IO  
✅ Activity logging in MongoDB  
✅ Email OTP verification (when configured)  
✅ Natural language expense parsing  

---

## Next Steps

1. **Customize the application** - Modify colors, branding, features
2. **Add more users** - Register through the signup page
3. **Create groups** - Test the group creation flow
4. **Add expenses** - Test expense splitting functionality
5. **Explore the code** - Learn from the implementation

---

## Quick Command Reference

### Start Everything:
```powershell
# Terminal 1 - Backend
cd "d:\Ongoing\dbms\Smart-Expense-Sharing-and-Settlement-System\backend"
npm start

# Terminal 2 - Frontend (new window)
cd "d:\Ongoing\dbms\Smart-Expense-Sharing-and-Settlement-System\frontend"
npm run dev
```

### Check Services:
```powershell
# MySQL
net start | findstr MySQL

# MongoDB
net start | findstr MongoDB
```

### Access Application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Backend Health Check: http://localhost:3000/

---

## Support

If you encounter issues:
1. Check the error messages carefully
2. Verify all prerequisites are installed
3. Ensure `.env` file is properly configured
4. Check that both databases are running
5. Review the troubleshooting section above

Happy coding! 🚀
