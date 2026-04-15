# Deployment Guide - InsightPDF App

## Overview
This application uses a split deployment architecture:
- **Backend**: Render (Python Flask API)
- **Frontend**: Vercel (React SPA)

## Backend Deployment (Render)

### Prerequisites
- Render account
- GitHub repository with your code

### Steps
1. **Push to GitHub**: Make sure your code is pushed to a GitHub repository
2. **Create Render Service**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: insightpdf-backend
     - **Environment**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `python app.py`
     - **Root Directory**: `backend`
3. **Environment Variables**:
   - `PORT`: `10000` (Render's default)
   - `ANTHROPIC_API_KEY`: Your actual API key
4. **Health Check**: Set to `/health`
5. **Deploy**: Click "Create Web Service"

### Backend URL
After deployment, your backend will be available at:
`https://insightpdf-backend.onrender.com`

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository with your code

### Steps
1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure:
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Environment Variables**:
       - `VITE_API_URL`: `https://insightpdf-backend.onrender.com`

3. **Deploy**: Click "Deploy"

### Alternative: Deploy via CLI
```bash
# From the frontend directory
cd frontend
vercel --prod
```

## Environment Variables

### Backend (.env)
```
ANTHROPIC_API_KEY=your_actual_api_key
PORT=10000
```

### Frontend (.env)
```
VITE_API_URL=https://insightpdf-backend.onrender.com
```

## Important Notes

1. **CORS Configuration**: The backend already has CORS enabled for all origins
2. **Health Check**: The `/health` endpoint is used by Render for health monitoring
3. **Static Files**: Backend no longer serves static files in production
4. **API Endpoints**: All API calls go through the backend URL
5. **Session Management**: Sessions are stored in memory (consider Redis for production)

## Testing the Deployment

1. **Backend Health Check**:
   ```bash
   curl https://insightpdf-backend.onrender.com/health
   ```

2. **Frontend Access**: Open your Vercel URL in the browser

3. **Full Test**:
   - Upload a PDF
   - Ask a question
   - Generate a summary
   - Create a quiz

## Troubleshooting

### Common Issues
1. **CORS Errors**: Make sure backend URL is correct in frontend env vars
2. **API Key Errors**: Ensure ANTHROPIC_API_KEY is set correctly in Render
3. **Build Failures**: Check that all dependencies are in requirements.txt
4. **Connection Refused**: Verify backend is deployed and running

### Logs
- **Render**: Check Render dashboard logs
- **Vercel**: Check Vercel dashboard logs

## Production Considerations

1. **Database**: Consider adding a database for session persistence
2. **Error Handling**: Add more robust error handling
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **File Storage**: Consider cloud storage for uploaded PDFs
5. **Monitoring**: Add application monitoring and alerting
