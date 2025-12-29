import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, X, FileText, AlertCircle } from "lucide-react";
import ArticleCard from "./components/ArticleCard";
import ArticleModal from "./components/ArticleModal";
import EditModal from "./components/EditModal";
import ScrapeModal from "./components/ScrapeModal";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
// console.log("API Base URL:", API_BASE_URL);

const App = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [enhancing, setEnhancing] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/articles`);
      setArticles(res.data);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        `Failed to load articles. Please try again later. (${err.message})`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/articles/${id}`);
      setArticles(articles.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete article");
    }
  };

  const handleEnhanceArticle = async (articleId) => {
    try {
      setEnhancing((prev) => ({ ...prev, [articleId]: true }));
      const response = await axios.post(
        `${API_BASE_URL}/api/enhance/${articleId}`
      );
      setArticles(
        articles.map((article) =>
          article._id === articleId ? response.data.data : article
        )
      );
      if (selectedArticle && selectedArticle._id === articleId) {
        setSelectedArticle(response.data.data);
      }
      alert("Article enhanced successfully!");
    } catch (error) {
      console.error("Enhancement error:", error);
      let errorMessage = "Failed to enhance article";
      if (error.response) {
        const { status, data } = error.response;

        if (status === 429) {
          errorMessage =
            "API Rate Limit Exceeded\n\n" +
            "You've reached the rate limit for the Groq API. This could be due to:\n" +
            "• Reaching your account's request limit\n" +
            "• Exceeding the maximum tokens per minute\n\n" +
            "Please try again in a few moments or check your Groq account for usage limits.";
        } else if (status === 401) {
          errorMessage =
            "Invalid API Key\n\n" +
            "The Groq API key is either missing or invalid. Please check your backend configuration.";
        } else if (status === 404) {
          errorMessage = "Article not found. It may have been deleted.";
        } else if (data?.error) {
          errorMessage = `Error: ${data.error}`;
        } else if (data?.message) {
          errorMessage = data.message;
        }
      } else if (error.request) {
        errorMessage =
          "🔌 Network Error\n\n" +
          "Could not connect to the server. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setEnhancing((prev) => ({ ...prev, [articleId]: false }));
    }
  };

  const handleEdit = async (formData) => {
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/articles/${editingArticle._id}`,
        formData
      );
      setArticles(
        articles.map((a) => (a._id === editingArticle._id ? res.data : a))
      );
      setEditingArticle(null);
    } catch (err) {
      console.error("[Edit error:", err);
      alert("Failed to update article");
    }
  };

  const handleScrape = async (url) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/articles/scrape`,
        { url },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (res.data.success) {
        if (res.data.articles) {
          const newArticles = res.data.articles;
          setArticles((prevArticles) => [...newArticles, ...prevArticles]);
          alert(
            res.data.message ||
              `Successfully scraped ${newArticles.length} articles!`
          );
        } else if (res.data.article) {
          const newArticle = res.data.article;
          setArticles((prevArticles) => [newArticle, ...prevArticles]);
          alert("Article scraped successfully!");
        } else {
          throw new Error(
            res.data.message || "Scrape successful but no article returned"
          );
        }
        setShowScrapeModal(false);
      } else {
        throw new Error(res.data.message || "Failed to scrape article");
      }
    } catch (err) {
      console.error("[v0] Scrape error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to scrape article. Please check the URL and try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                BeyondChats Article Viewer
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage and view your articles
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
              >
                {viewMode === "grid" ? "List View" : "Grid View"}
              </button>
              <button
                onClick={() => setShowScrapeModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Scrape Article
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
            <div className="flex">
              <div className="shrink-0">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No articles
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by scraping a new article.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowScrapeModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Scrape Article
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`grid ${
              viewMode === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "grid-cols-1 gap-4"
            }`}
          >
            {articles.map((article) => (
              <ArticleCard
                key={article._id}
                article={article}
                onEdit={setEditingArticle}
                onDelete={handleDelete}
                onView={setSelectedArticle}
                onEnhance={handleEnhanceArticle}
                enhancing={enhancing}
              />
            ))}
          </div>
        )}
      </main>

      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
      {editingArticle && (
        <EditModal
          article={editingArticle}
          onClose={() => setEditingArticle(null)}
          onSave={handleEdit}
        />
      )}
      {showScrapeModal && (
        <ScrapeModal
          onClose={() => setShowScrapeModal(false)}
          onScrape={handleScrape}
        />
      )}
    </div>
  );
};

export default App;
