const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: [process.env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean) }));
app.use(express.json());

// Routes will be added here
app.use('/api/requirements', require('./routes/requirementRoutes'));
app.use('/api/test-cases', require('./routes/testCaseRoutes'));
app.use('/api/test-cases', require('./routes/qualityRoutes'));
app.use('/api/requirement-documents', require('./routes/documentRoutes'));
app.use('/api/requirements', require('./routes/aiGenerationRoutes'));
app.use('/api/duplicates', require('./routes/duplicateRoutes'));
app.use('/api/test-case-imports', require('./routes/importRoutes'));
app.use('/api/test-cases', require('./routes/versionRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/saved-filters', require('./routes/savedFilterRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/defects', require('./routes/defectRoutes'));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AI Test Manager API is running' });
});

const supabase = require('./config/supabase');
app.get('/api/profiles/me', require('./middleware/authMiddleware').requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', req.user.id).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
