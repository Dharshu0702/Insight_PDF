import { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ messages, loading, onSendMessage, pdfLoaded }) {
  const [input, setInput] = useState('');
  const [quizStates, setQuizStates] = useState({}); // Track quiz answers by message index
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && pdfLoaded) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-4xl mb-4"></p>
              <p className="text-gray-500 text-lg">
                Upload a PDF to start asking questions
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.type === 'summary' ? (
                <div className="w-full max-w-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl"></span>
                    <h3 className="text-lg font-semibold text-gray-800">Summary</h3>
                  </div>
                  
                  {msg.content && msg.content.includes('**Overview**') ? (
                    <div className="space-y-4">
                      {msg.content.split('\n\n').map((section, i) => {
                        if (section.includes('**Overview**')) {
                          return (
                            <div key={i} className="bg-white rounded-lg p-4 border border-green-200">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {section.replace('**Overview**\n', '').trim()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Main Ideas:</h4>
                        <ul className="space-y-2">
                          {msg.content.split('\n').filter(line => line.startsWith('*')).map((point, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-700">
                              <span className="text-green-600 font-bold">•</span>
                              <span>{point.replace('*', '').trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
              ) : msg.type === 'quiz' ? (
                <QuizComponent
                  quiz={msg.content.quiz}
                  msgIndex={idx}
                  quizState={quizStates[idx] || {}}
                  onUpdateQuizState={(state) => {
                    setQuizStates(prev => ({ ...prev, [idx]: state }));
                  }}
                />
              ) : msg.type === 'assistant' ? (
                <div className="w-full max-w-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl"></span>
                    <h3 className="text-lg font-semibold text-gray-800">Answer</h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    {msg.content && msg.content.includes('•') ? (
                      <ul className="space-y-3">
                        {msg.content.split('\n').filter(line => line.trim().length > 0).map((point, i) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                            <span className="text-blue-600 font-bold text-lg">•</span>
                            <span>{point.replace(/^[•*-]\s*/, '').trim()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                        {msg.content.split('\n\n').map((paragraph, i) => {
                          if (paragraph.trim()) {
                            // Split by common bullet patterns
                            const lines = paragraph.split('\n').filter(l => l.trim());
                            if (lines.length > 1 && lines.some(l => /^[-•*]|^\d+\./.test(l.trim()))) {
                              return (
                                <ul key={i} className="space-y-2 ml-4">
                                  {lines.map((line, idx) => (
                                    <li key={idx} className="flex gap-2">
                                      <span className="text-blue-600 font-bold">•</span>
                                      <span>{line.replace(/^[-•*]\s*|\d+\.\s*/, '').trim()}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p key={i}>{paragraph}</p>;
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-md px-4 py-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : msg.type === 'error'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {!pdfLoaded ? (
          <p className="text-center text-gray-500 text-sm mb-3">
             Upload a PDF first to start chatting
          </p>
        ) : null}
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            disabled={!pdfLoaded || loading}
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows="3"
          />
          <button
            onClick={handleSend}
            disabled={!pdfLoaded || loading || !input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizComponent({ quiz, msgIndex, quizState, onUpdateQuizState }) {
  // Quiz display component - fixed data structure issue v2
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Validate quiz data
  const hasValidQuestions = quiz?.questions && Array.isArray(quiz.questions) && quiz.questions.length > 0;
  const hasPlaceholderData = hasValidQuestions && quiz.questions.some(q => 
    q.question?.includes('Question text?') || 
    q.options?.some(opt => opt?.includes('Option1') || opt?.includes('Option2'))
  );

  if (!hasValidQuestions || hasPlaceholderData) {
    return (
      <div className="w-full max-w-2xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl"></span>
          <h3 className="text-lg font-semibold text-gray-800">Quiz Generation Failed</h3>
        </div>
        <div className="bg-white rounded-lg p-4 border border-red-100">
          <p className="text-sm text-red-700">
            The API returned invalid or placeholder data. This can happen when:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-red-600 ml-4">
            <li className="flex gap-2">
              <span>•</span>
              <span>The PDF content is too short or unclear</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>The API service is experiencing issues</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>The number of requested questions is too high</span>
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-600">
            Try uploading a different PDF with more content, or request fewer questions.
          </p>
        </div>
      </div>
    );
  }

  const handleSelectAnswer = (questionIndex, selectedOption) => {
    const newState = { ...quizState };
    newState[questionIndex] = selectedOption;
    onUpdateQuizState(newState);
  };

  const handleSubmitQuiz = () => {
    console.log('🐛 Quiz Submit - Full quiz data:', JSON.stringify(quiz, null, 2));
    console.log('🐛 Quiz Submit - User answers:', quizState);
    
    let correct = 0;
    quiz.questions?.forEach((q, i) => {
      const userAnswer = quizState[i];
      const correctAnswer = q.correct_option;
      
      // Normalize answers for comparison
      const normalizedUserAnswer = userAnswer ? userAnswer.trim() : '';
      const normalizedCorrectAnswer = correctAnswer ? correctAnswer.trim() : '';
      
      console.log(`Q${i+1}: User="${normalizedUserAnswer}" vs Correct="${normalizedCorrectAnswer}" -> Match=${normalizedUserAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase()}`);
      
      // Compare case-insensitively
      if (normalizedUserAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase()) {
        correct++;
      }
    });
    const percentage = Math.round((correct / quiz.questions.length) * 100);
    console.log(` Score: ${correct}/${quiz.questions.length} = ${percentage}%`);
    setScore(percentage);
    setSubmitted(true);
  };

  const allAnswered = quiz.questions?.every((q, i) => quizState[i] !== undefined);

  if (submitted) {
    return (
      <div className="w-full max-w-2xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500 mb-2">
            {score}%
          </div>
          <p className="text-2xl font-semibold text-gray-800">
            {score >= 80 ? ' Excellent!' : score >= 60 ? ' Good job!' : score >= 40 ? ' Keep learning!' : ' Try again!'}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-yellow-200 mb-4">
          <p className="text-gray-700 mb-4">
          You got <span className="font-bold text-lg">{quiz.questions?.filter((q, i) => {
            const userAnswer = quizState[i] ? quizState[i].trim() : '';
            const correctAnswer = q.correct_option ? q.correct_option.trim() : '';
            return userAnswer.toLowerCase() === correctAnswer.toLowerCase();
          }).length} out of {quiz.questions.length}</span> questions correct!
        </p>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {quiz.questions?.map((q, i) => {
            const userAnswer = quizState[i] ? quizState[i].trim() : '';
            const correctAnswer = q.correct_option ? q.correct_option.trim() : '';
            const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
              return (
                <div key={i} className={`p-3 rounded border-l-4 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                  <p className="text-sm font-semibold text-gray-800">{i + 1}. {q.question}</p>
                  <p className={`text-sm mt-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    Your answer: <span className="font-medium">{quizState[i]}</span>
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-green-700 mt-1">
                      Correct: <span className="font-medium">{q.correct_option || 'Not specified'}</span>
                    </p>
                  )}
                  {q.explanation && (
                    <p className="text-xs text-gray-600 mt-2 italic">{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl"></span>
        <h3 className="text-lg font-semibold text-gray-800">Quiz</h3>
      </div>
      <div className="space-y-4">
        {quiz.questions?.map((q, i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-yellow-200">
            <p className="font-semibold text-gray-800 mb-3">{i + 1}. {q.question}</p>
            <div className="space-y-2 ml-4">
              {q.options?.map((opt, j) => (
                <label key={j} className="flex items-start gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded transition">
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={quizState[i] === opt}
                    onChange={() => handleSelectAnswer(i, opt)}
                    className="mt-1 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={handleSubmitQuiz}
        disabled={!allAnswered}
        className={`mt-4 w-full py-2 px-4 rounded-lg font-semibold transition ${
          allAnswered
            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {allAnswered ? '✓ Submit Quiz' : `Answer all questions (${Object.keys(quizState).length}/${quiz.questions.length})`}
      </button>
    </div>
  );
}
