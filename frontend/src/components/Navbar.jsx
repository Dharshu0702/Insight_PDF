export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-full px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl"></div>
            <h1 className="text-2xl font-bold text-gray-800">
              🌀 InsightPDF
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            AI-Powered Learning with Qwen
          </p>
        </div>
      </div>
    </nav>
  );
}