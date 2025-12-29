import { useState, useEffect } from "react";

const ArticleModal = ({ article, onClose }) => {
  const [showEnhanced, setShowEnhanced] = useState(false);

  useEffect(() => {
    if (article) {
      setShowEnhanced(!!article.enhancedContent);
    }
  }, [article]);

  if (!article) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-900 pr-8">
            {article.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold shrink-0"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {article.enhancedContent && (
            <div className="mb-6 flex justify-end">
              <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                <button
                  onClick={() => setShowEnhanced(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    !showEnhanced
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setShowEnhanced(true)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    showEnhanced
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Enhanced AI
                </button>
              </div>
            </div>
          )}

          {article.image && (
            <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={article.image || "/placeholder.svg"}
                alt={article.title}
                className="w-full h-auto max-h-100 object-cover"
              />
            </div>
          )}

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div>
              <p className="text-sm text-gray-600">
                By{" "}
                <span className="font-medium text-gray-900">
                  {article.author || "Anonymous"}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                {new Date(article.publishedAt).toLocaleDateString()}
              </p>
            </div>
            {article.source && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                {article.source}
              </span>
            )}
          </div>

          <div className="prose max-w-none">
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {showEnhanced ? article.enhancedContent : article.content}
            </div>
          </div>

          {article.url && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View Original Article →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleModal;
