# Smart Expense Tracker - Realtime Portfolio Edition

Updated features:
- Separate Dashboard, Transactions, and Crypto Portfolio pages
- Live crypto market data through backend fetch + cache layer
- Manual buy price support for limit-order style entries
- Sell order support from current holdings
- Realtime portfolio summary, P/L, and net worth refresh
- Jenkins CI/CD pipeline through `Jenkinsfile`

## Run locally

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

## Recommended backend `.env`
```env
PORT=5001
CLIENT_URL=http://localhost:3000
MONGO_URI=mongodb://127.0.0.1:27017/smart_expense_tracker
COINGECKO_API_BASE=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=
MARKET_CACHE_TTL_MS=20000
```

## Recommended frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5001/api
```

## Jenkins
Use the included `Jenkinsfile` in a Pipeline job.
