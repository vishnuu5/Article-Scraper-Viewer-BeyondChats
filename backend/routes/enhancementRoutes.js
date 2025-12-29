import express from "express";
import { enhanceArticle } from "../services/articleEnhancer.js";
import Article from "../models/Article.js";

const router = express.Router();

/**
 * @route   POST /api/enhance/:id
 * @desc    Enhance an article using AI
 * @access  Public
 */
router.post("/:id", async (req, res) => {
  const startTime = Date.now();
  const { id } = req.params;

  console.log(`Enhancement request received for article ${id}`);

  try {
    const article = await Article.findById(id);
    if (!article) {
      console.error(`Article not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Article not found",
        articleId: id,
      });
    }

    console.log(`Starting enhancement for article: ${article.title}`);

    const enhancedArticle = await enhanceArticle(id);

    console.log(`Enhancement completed in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      message: "Article enhanced successfully",
      data: enhancedArticle,
    });
  } catch (error) {
    console.error(`Enhancement error for article ${id}:`, error);

    const statusCode = error.statusCode || 500;
    let errorMessage = "Failed to enhance article";
    let errorDetails = error.message;

    if (
      error.message.includes("quota") ||
      error.message.includes("429") ||
      statusCode === 429
    ) {
      errorMessage = "API quota exceeded";
      errorDetails =
        "The OpenAI API quota has been exceeded. Please check your OpenAI account billing and quota settings.";
    } else if (
      error.message.includes("API key") ||
      error.message.includes("401") ||
      statusCode === 401
    ) {
      errorMessage = "Invalid API key";
      errorDetails =
        "The OpenAI API key is invalid or missing. Please check your environment variables.";
    } else if (statusCode === 404) {
      errorMessage = "Article not found";
      errorDetails =
        "The requested article could not be found in the database.";
    }

    const errorResponse = {
      success: false,
      message: errorMessage,
      error: errorDetails,
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
        originalError: error.message,
      }),
      timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(errorResponse);
  }
});

export default router;
