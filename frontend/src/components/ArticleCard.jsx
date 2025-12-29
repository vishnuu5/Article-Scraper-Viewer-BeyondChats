const ArticleCard = ({
  article,
  onEdit,
  onDelete,
  onView,
  onEnhance,
  enhancing,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {article.image && (
        <div className="h-48 overflow-hidden">
          <img
            src={article.image || "/placeholder.svg"}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
          {article.title}
        </h3>
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {article.enhancedContent
            ? article.enhancedContent.substring(0, 150) + "..."
            : article.content}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span className="font-medium">{article.author || "Anonymous"}</span>
          <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
        </div>

        {article.source && (
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
              {article.source}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onView(article)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            {article.enhancedContent ? "View Enhanced" : "View"}
          </button>

          {!article.enhancedContent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnhance(article._id);
              }}
              disabled={enhancing[article._id]}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                enhancing[article._id]
                  ? "bg-yellow-100 text-yellow-700 cursor-not-allowed"
                  : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
              }`}
              title="Enhance with AI"
            >
              {enhancing[article._id] ? "Enhancing..." : "Enhance"}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(article);
            }}
            className="px-3 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            Edit
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(article._id);
            }}
            className="px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-md hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
