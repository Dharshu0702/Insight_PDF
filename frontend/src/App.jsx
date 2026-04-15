import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Generate or get session ID
const getSessionId = () => {
  let sessionId = localStorage.getItem('smartStudySessionId');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('smartStudySessionId', sessionId);
  }
  return sessionId;
};

// Configure axios to send session ID with all requests
axios.defaults.headers.common['X-Session-ID'] = getSessionId();

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfPreview, setPdfPreview] = useState('');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);

  // Upload PDF
  const handleUploadPDF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setUploadStatus('Uploading...');

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadStatus(` ${response.data.message}`);
      setPdfLoaded(true);
      setPdfPreview(response.data.preview);
      setMessages([{
        type: 'system',
        content: `Loaded: ${file.name} (${response.data.pages} pages)`
      }]);
    } catch (error) {
      setUploadStatus(` ${error.response?.data?.error || 'Upload failed'}`);
    } finally {
      setLoading(false);
    }
  };

  // Ask Question
  const handleAskQuestion = async (question) => {
    if (!question.trim()) return;

    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      content: question
    }]);

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/ask`, {
        question,
        difficulty: 'intermediate'
      });

      setMessages(prev => [...prev, {
        type: 'assistant',
        content: response.data.answer
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Error: ${error.response?.data?.error || 'Failed to get response'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Summarize
  const handleSummarize = async () => {
    if (!pdfLoaded) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Please upload a PDF first'
      }]);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/summarize`);
      setMessages(prev => [...prev, {
        type: 'summary',
        content: response.data.summary,
        isSystemGenerated: true
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: error.response?.data?.error || 'Summary generation failed'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Generate Quiz
  const handleGenerateQuiz = async () => {
    if (!pdfLoaded) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Please upload a PDF first'
      }]);
      return;
    }

    setShowQuizModal(true);
  };

  const handleConfirmQuiz = async () => {
    setShowQuizModal(false);
    setLoading(true);

    try {
      console.log(` Requesting ${numQuestions} quiz questions from backend...`);
      const response = await axios.post(`${API_URL}/quiz`, { 
        difficulty: 'intermediate',
        num_questions: numQuestions
      });
      
      console.log(' Quiz response received:', response.data);
      console.log(` Quiz has ${response.data.quiz?.questions?.length || 0} questions`);
      
      setMessages(prev => [...prev, {
        type: 'quiz',
        content: response.data.quiz,
        isSystemGenerated: true
      }]);
    } catch (error) {
      console.error('❌ Quiz error:', error.response?.data);
      setMessages(prev => [...prev, {
        type: 'error',
        content: error.response?.data?.error || 'Quiz generation failed'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Clear all
  const handleClear = async () => {
    if (window.confirm('Clear all data?')) {
      await axios.post(`${API_URL}/clear`);
      setPdfFile(null);
      setPdfLoaded(false);
      setPdfPreview('');
      setMessages([]);
      setUploadStatus('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          pdfLoaded={pdfLoaded}
          uploadStatus={uploadStatus}
          loading={loading}
          onUpload={handleUploadPDF}
          onSummarize={handleSummarize}
          onQuiz={handleGenerateQuiz}
          onClear={handleClear}
          pdfPreview={pdfPreview}
        />


      {/* Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-lg max-w-sm w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4"> Generate Quiz</h2>
            <p className="text-gray-600 mb-6">How many questions would you like?</p>
            
            <input
              type="number"
              min="1"
              max="20"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-6
                focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-semibold"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuizModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg
                  hover:bg-gray-400 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmQuiz}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg
                  hover:bg-purple-600 disabled:bg-gray-300 font-medium transition"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
        {/* Right Chat Panel */}
        <ChatPanel
          messages={messages}
          loading={loading}
          onSendMessage={handleAskQuestion}
          pdfLoaded={pdfLoaded}
        />
      </div>
    </div>
  );
}

export default App;