# 📊 SalesPulse - Interactive Sales Analytics Dashboard

> AI-powered business analytics platform with real-time insights, stock market integration, and intelligent chatbot.

---

## 🚀 Quick Start

### **Option 1: One-Click Start (Recommended)**
```bash
START-SALESPULSE.bat
```
This will start all servers and open the app in your browser.

### **Option 2: Manual Start**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend  
cd backend
venv\Scripts\activate
python run.py

# Terminal 3: Stock Proxy
cd stock-proxy
node server.js
```

**Access**: http://localhost:5173

---

## ✨ Features

- 📈 **Sales Analytics** - Real-time dashboards with charts and metrics
- 🤖 **AI Chatbot** - Intelligent assistant with conversation memory
- 📊 **Stock Market** - Real-time stock search and data
- 🎯 **Goal Tracking** - Set and monitor business targets
- 📄 **Reports** - Generate PDF/CSV exports
- ⭐ **Feedback System** - Collect user ratings and comments
- 🔐 **Authentication** - Secure JWT-based login

---

## 🛠️ Tech Stack

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS  
**Backend**: Python FastAPI + SQLAlchemy + SQLite  
**AI**: OpenRouter API (Gemini 2.0)  
**Charts**: Recharts  
**Stock Data**: Finnhub API (via proxy)

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3.10+

### Setup
```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..

# 3. Install stock proxy dependencies
cd stock-proxy
npm install
cd ..
```

---

## 🔑 Environment Variables

Create `backend/.env`:
```env
# Required
SECRET_KEY=your-secret-key-here
OPENROUTER_API_KEY=your-openrouter-api-key

# Optional (for enhanced features)
GOOGLE_API_KEY=your-google-api-key
GOOGLE_CSE_ID=your-google-cse-id
```

---

## 📁 Project Structure

```
SalesPulse/
├── src/                    # Frontend React app
│   ├── components/         # UI components
│   ├── pages/             # Page components
│   └── services/          # API services
├── backend/               # Python FastAPI backend
│   ├── routes/           # API endpoints
│   ├── models.py         # Database models
│   └── main.py           # App entry point
├── stock-proxy/          # Stock data proxy server
└── public/               # Static assets
```

---

## 🎯 API Endpoints

**Authentication**
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile

**Analytics**
- `GET /api/overview` - Dashboard metrics
- `GET /api/revenue-trend` - Revenue charts
- `GET /api/sales-by-category` - Category breakdown

**AI & Chat**
- `POST /api/chat` - Chat with AI
- `GET /api/chat/history` - Chat history
- `GET /api/chat/status` - AI status

**Stock Features**
- `GET /stock-api/api/stock?symbol=AAPL` - Get stock data
- `POST /api/stock-feedback/` - Submit feedback

**Admin (View Feedback)**
- `GET /api/admin/feedback/all` - Get all user feedback
- `GET /api/admin/feedback/stats` - Feedback statistics
- `GET /api/admin/feedback/export-csv` - Export to CSV

**Reports**
- `POST /api/reports/sales` - Generate sales report
- `GET /api/reports/goals` - Get goals

---

## 💾 Database

**SQLite** database at `backend/sales.db`

**Tables**:
- `users` - User accounts
- `sales_records` - Sales transactions
- `goals` - Business goals
- `chat_messages` - AI chat history
- `stock_feedback` - User feedback

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
pytest

# Check TypeScript
npx tsc --noEmit

# Lint frontend
npm run lint
```

---

```
Username: demo
Password: demo123
```

---

## 👥 User Roles & Permissions

SalesPulse supports three user roles with different access levels:

### **Quick Comparison**

```
┌─────────────────────────────────┬──────────┬──────────┬──────────┐
│ Feature                         │  Viewer  │ Manager  │  Admin   │
├─────────────────────────────────┼──────────┼──────────┼──────────┤
│ DASHBOARD ACCESS                │          │          │          │
│ View Analytics                  │    ✅    │    ✅    │    ✅    │
│ View Sales Records              │    ✅    │    ✅    │    ✅    │
│ View Goals                      │    ✅    │    ✅    │    ✅    │
│ AI Chat Assistant               │    ✅    │    ✅    │    ✅    │
│ Stock Market Widget             │    ✅    │    ✅    │    ✅    │
├─────────────────────────────────┼──────────┼──────────┼──────────┤
│ DATA MANAGEMENT                 │          │          │          │
│ Add Sales Records               │    ❌    │    ✅    │    ✅    │
│ Edit Sales Records              │    ❌    │    ✅    │    ✅    │
│ Delete Sales Records            │    ❌    │    ✅    │    ✅    │
│ Create Goals                    │    ❌    │    ✅    │    ✅    │
│ Export Reports (PDF/CSV)        │    ❌    │    ✅    │    ✅    │
├─────────────────────────────────┼──────────┼──────────┼──────────┤
│ ADMIN FEATURES                  │          │          │          │
│ Access Admin Panel              │    ❌    │    ❌    │    ✅    │
│ View All Users                  │    ❌    │    ❌    │    ✅    │
│ Change User Roles               │    ❌    │    ❌    │    ✅    │
│ Delete Users                    │    ❌    │    ❌    │    ✅    │
│ Bulk User Operations            │    ❌    │    ❌    │    ✅    │
│ Send Notifications              │    ❌    │    ❌    │    ✅    │
│ View Activity Logs              │    ❌    │    ❌    │    ✅    │
└─────────────────────────────────┴──────────┴──────────┴──────────┘
```

### **Role Descriptions**

**👁️ VIEWER (Default)**
```
✅ View analytics, sales, and goals
✅ Use AI chat and stock widgets
❌ Cannot modify any data
📌 Best for: Sales reps, junior staff
```

**👔 MANAGER**
```
✅ Everything Viewer can do
✅ Add/edit/delete sales records
✅ Create and manage goals
✅ Export reports
❌ Cannot access admin features
📌 Best for: Team leads, department heads
```

**🛡️ ADMIN (Full Control)**
```
✅ Everything Manager can do
✅ Access Admin Panel
✅ Manage all users
✅ Change user roles
✅ Bulk operations
✅ Send notifications
✅ View activity logs
📌 Best for: Business owners, IT admins
```

### **Creating Admin Accounts**

All new signups are automatically assigned the **Viewer** role. To create an admin account:

```bash
# Run the admin creation script
python force_admin.py
```

This creates:
- Username: `admin`
- Email: `admin@salespulse.com`
- Password: `Admin@123`
- Role: `Admin`

After the first admin is created, use the **Admin Panel** (Goals & Targets → Admin Panel tab) to promote other users.

---

## 🛑 Stop All Servers

```bash
STOP-SALESPULSE.bat
```

Or press `Ctrl+C` in each terminal.

---

## 🔧 Troubleshooting

**Port already in use?**
```bash
# Kill process on port 5173 (frontend)
npx kill-port 5173

# Kill process on port 8000 (backend)
npx kill-port 8000
```

**Database issues?**
```bash
# Delete and recreate database
cd backend
del sales.db
python database.py
```

**Dependencies issues?**
```bash
# Reinstall frontend
rm -rf node_modules package-lock.json
npm install

# Reinstall backend
cd backend
rm -rf venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

## 📊 Screenshots

1. **Dashboard** - Sales overview with charts
2. **Stock Search** - Real-time stock data
3. **AI Chat** - Intelligent business assistant
4. **Reports** - PDF/CSV generation
5. **Goals** - Track business targets

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

This project is for educational purposes.

---

## 🔗 Links

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Stock Proxy**: http://localhost:3001

---

## 💡 Tips

- Use the AI chatbot to ask about your sales data
- Generate PDF reports for presentations
- Track goals to monitor progress
- Search stocks for market insights
- Leave feedback to help improve features

---

**Built with ❤️ for better business analytics**

---

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API documentation at `/docs`
3. Check browser console for errors
4. Verify all servers are running

**Happy analyzing! 📊✨**
#   - S a l e s P u l s e - I n t e r a c t i v e - D a t a - A n a l y t i c s - D a s h b o a r d  
 