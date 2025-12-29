import axios from "axios";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Article from "../models/Article.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(process.cwd(), ".env");
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

// Debug log environment variables
// console.log("Environment variables loaded:", {
//   NODE_ENV: process.env.NODE_ENV,
//   OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "*** (set)" : "undefined",
//   API_BASE_URL: process.env.API_BASE_URL,
// });

let groq;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("GROQ_API_KEY is not defined in environment variables");
  }

  const apiKeyPreview = process.env.OPENAI_API_KEY
    ? `${process.env.OPENAI_API_KEY.substring(
        0,
        8
      )}...${process.env.OPENAI_API_KEY.substring(
        process.env.OPENAI_API_KEY.length - 4
      )}`
    : "undefined";
  console.log(`Initializing Groq client with API key: ${apiKeyPreview}`);

  groq = new Groq({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log("Groq client initialized successfully");
} catch (error) {
  console.error("Error initializing Groq client:", error.message);
  process.exit(1);
}

/**
 * Search Google for articles
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of search results
 */
export const searchGoogle = async (query) => {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params: {
          key: process.env.GOOGLE_API_KEY,
          cx: process.env.GOOGLE_CSE_ID,
          q: query,
          num: 5,
        },
      }
    );
    return response.data.items
      .filter(
        (item) =>
          item.link &&
          (item.link.includes("blog") || item.link.includes("article"))
      )
      .slice(0, 2);
  } catch (error) {
    console.error("Error searching Google:", error);
    return [];
  }
};

/**
 * Scrape content from a URL
 * @param {string} url - URL to scrape
 * @returns {Promise<string>} - Article content
 */
export const scrapeArticleContent = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);
    const content =
      $("article").text() ||
      $(".post-content").text() ||
      $(".entry-content").text() ||
      $("main").text();

    return content.trim();
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return "";
  }
};

/**
 * Enhance article using OpenAI
 * @param {string} originalContent - Original article content
 * @param {Array} referenceContents - Array of reference contents
 * @returns {Promise<string>} - Enhanced article content
 */
export const enhanceWithAI = async (
  originalContent,
  referenceContents = []
) => {
  console.log("===== Starting AI Enhancement =====");

  try {
    if (!originalContent || typeof originalContent !== "string") {
      throw new Error("Invalid or missing original content");
    }

    console.log(
      `Original content length: ${originalContent.length} characters`
    );

    const validReferences = Array.isArray(referenceContents)
      ? referenceContents.filter(
          (ref) => ref && typeof ref === "string" && ref.trim().length > 0
        )
      : [];

    console.log(`Using ${validReferences.length} valid references`);
    if (validReferences.length > 0) {
      console.log(
        `Reference lengths:`,
        validReferences.map((ref) => ref.length)
      );
    }

    const prompt = `Enhance the following article while maintaining its core message and style.
    Improve formatting, structure, and clarity. Add relevant subheadings where appropriate.
    
    CRITICAL REQUIREMENT: At the very bottom of the enhanced article, you MUST add a "References" section.
    List the reference articles provided below with their URLs if available.
    
    ORIGINAL ARTICLE:
    ${originalContent}
    
    ${
      validReferences.length > 0
        ? "REFERENCES:\n" + validReferences.join("\n\n---\n\n")
        : ""
    }
    
    ENHANCED ARTICLE:`;

    console.log("Sending request to OpenAI...");
    console.log(`Prompt length: ${prompt.length} characters`);

    const startTime = Date.now();
    const completion = await Promise.race([
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that enhances article content. Focus on improving readability, structure, and engagement while preserving the original meaning and style.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("Groq API request timed out after 30 seconds")),
          30000
        )
      ),
    ]);

    const duration = Date.now() - startTime;
    console.log(`Received Groq API response in ${duration}ms`);

    if (!completion?.choices?.[0]?.message?.content) {
      console.error(
        "Invalid response structure from Groq API:",
        JSON.stringify(completion, null, 2)
      );
      throw new Error("Invalid response structure from Groq API");
    }

    const enhancedContent = completion.choices[0].message.content.trim();

    if (!enhancedContent) {
      throw new Error("Received empty content from Groq API");
    }

    console.log(
      `Successfully enhanced content (${enhancedContent.length} characters)`
    );
    console.log("===== AI Enhancement Completed Successfully =====");

    return enhancedContent;
  } catch (error) {
    console.error("===== AI ENHANCEMENT FAILED =====");
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      originalContentLength: originalContent?.length,
      referenceContentsCount: referenceContents?.length,
      timestamp: new Date().toISOString(),
    });
    let errorMessage = "AI enhancement failed: ";
    let statusCode = 500;

    if (
      error.message.includes("401") ||
      error.message.includes("authentication")
    ) {
      errorMessage += "Authentication error - Please check your Groq API key";
      statusCode = 401;
    } else if (
      error.message.includes("quota") ||
      error.message.includes("429")
    ) {
      errorMessage =
        "You exceeded your current quota or rate limit. Please check your Groq account billing and usage limits.";
      statusCode = 429;
    } else if (
      error.message.includes("rate limit") ||
      error.message.includes("rate_limit")
    ) {
      errorMessage =
        "Rate limit exceeded - Please try again later or check your Groq plan limits";
      statusCode = 429;
    } else if (error.message.includes("timeout")) {
      errorMessage =
        "Request timed out - The Groq API server took too long to respond";
      statusCode = 504;
    } else {
      errorMessage += error.message;
    }

    console.error(` ${errorMessage}`);
    console.error("==========================================");

    const enhancedError = new Error(errorMessage);
    enhancedError.statusCode = statusCode;
    throw enhancedError;
  }
};

/**
 * Main function to enhance an article
 * @param {string} articleId - ID of the article to enhance
 * @returns {Promise<Object>} - Enhanced article data
 */
export const enhanceArticle = async (articleId) => {
  console.log(`===== Starting article enhancement process =====`);
  console.log(`Article ID: ${articleId}`);

  try {
    console.log(" Fetching article from database...");
    const article = await Article.findById(articleId);
    if (!article) {
      const error = new Error(`Article with ID ${articleId} not found`);
      console.error("Error:", error.message);
      throw error;
    }

    console.log(`Found article: "${article.title}"`);
    console.log(
      `Content length: ${article.content?.length || 0} characters`
    );
    console.log("Searching for related articles...");
    let searchResults = [];
    try {
      searchResults = await searchGoogle(article.title);
      console.log(`Found ${searchResults.length} search results`);
      if (searchResults.length > 0) {
        console.log("First result:", {
          title: searchResults[0].title,
          link: searchResults[0].link,
        });
      }
    } catch (searchError) {
      console.error("Error in searchGoogle:", {
        message: searchError.message,
        stack: searchError.stack,
      });
      searchResults = [];
    }

    let referenceContents = [];
    if (searchResults.length > 0) {
      console.log("Scraping reference content...");
      try {
        referenceContents = await Promise.all(
          searchResults.slice(0, 2).map(async (result, index) => {
            try {
              const content = await scrapeArticleContent(result.link);
              console.log(
                `Successfully scraped reference ${index + 1}: ${
                  result.link
                }`
              );
              return `SOURCE URL: ${result.link}\nCONTENT: ${content}`;
            } catch (e) {
              console.error(`[v0] Error scraping ${result.link}:`, e.message);
              return "";
            }
          })
        );
        referenceContents = referenceContents.filter(
          (content) => content && content.trim().length > 0
        );
        console.log(
          `Successfully scraped ${referenceContents.length} references`
        );
      } catch (scrapeError) {
        console.error("Error in scrapeArticleContent:", {
          message: scrapeError.message,
          stack: scrapeError.stack,
        });
        referenceContents = [];
      }
    }

    console.log("Starting AI enhancement...");
    console.log(
      `Original content length: ${article.content?.length || 0} characters`
    );
    console.log(`Using ${referenceContents.length} reference contents`);

    let enhancedContent;
    try {
      enhancedContent = await enhanceWithAI(article.content, referenceContents);
      console.log("AI enhancement completed successfully");
      console.log(
        `Enhanced content length: ${
          enhancedContent?.length || 0
        } characters`
      );
    } catch (aiError) {
      console.error("Error in enhanceWithAI:", {
        message: aiError.message,
        stack: aiError.stack,
        originalContentLength: article.content?.length,
        referenceContentsCount: referenceContents.length,
        statusCode: aiError.statusCode,
      });
      const error = new Error(`AI enhancement failed: ${aiError.message}`);
      error.statusCode = aiError.statusCode || 500;
      throw error;
    }

    console.log("Updating article in database...");
    const updateData = {
      enhancedContent,
      lastEnhanced: new Date(),
      status: "enhanced",
    };

    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      {
        $set: {
          enhancedContent: enhancedContent,
          status: "completed",
          enhancedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedArticle) {
      const error = new Error("Failed to update article with enhanced content");
      error.statusCode = 500;
      throw error;
    }

    console.log("Article updated successfully");
    console.log("===== ENHANCEMENT PROCESS COMPLETED =====\n");

    return updatedArticle;
  } catch (error) {
    console.error("===== ENHANCEMENT PROCESS FAILED =====");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    console.error("=====================================\n");

    try {
      await Article.findByIdAndUpdate(articleId, {
        status: "error",
        lastError: error.message.substring(0, 500),
      });
    } catch (updateError) {
      console.error(
        "Failed to update article with error status:",
        updateError
      );
    }

    throw error;
  }
};
