export default function Sidebar({
  pdfLoaded,
  uploadStatus,
  loading,
  onUpload,
  onSummarize,
  onQuiz,
  onClear,
  pdfPreview
}) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
      {/* Upload Section */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
           Upload Notes
        </h2>
        
        <label className="block">
          <input
            type="file"
            accept=".pdf"
            onChange={onUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
        </label>

        {uploadStatus && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">{uploadStatus}</p>
          </div>
        )}

        
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-b border-gray-200 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
           Quick Actions
        </h3>

        <button
          onClick={onSummarize}
          disabled={!pdfLoaded || loading}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg
            hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed
            font-medium text-sm transition"
        >
           Summarize
        </button>

        <button
          onClick={onQuiz}
          disabled={!pdfLoaded || loading}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg
            hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed
            font-medium text-sm transition"
        >
           Generate Quiz
        </button>

        <button
          onClick={onClear}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg
            hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed
            font-medium text-sm transition"
        >
           Clear All
        </button>
      </div>

      {/* Difficulty Selector */}
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong> Tip:</strong> Upload a PDF, then ask questions or generate summaries!
          </p>
        </div>
      </div>
    </div>
  );
}