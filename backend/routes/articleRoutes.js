import express from "express";
import Article from "../models/Article.js";
import {
  scrapeArticle,
  scrapeMultipleArticles,
  extractArticleLinks,
} from "../services/scraper.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  const article = new Article(req.body);
  try {
    const newArticle = await article.save();
    res.status(201).json(newArticle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updatedArticle = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedArticle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: "Article deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/scrape", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      console.error("No URL provided in request body");
      return res.status(400).json({
        success: false,
        message: "URL is required",
        error: "URL parameter is missing in the request body",
      });
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      console.error(" Invalid URL format:", url);
      return res.status(400).json({
        success: false,
        message: "Invalid URL format",
        error: "Please provide a valid URL including http:// or https://",
      });
    }

    // console.log(`Starting scrape of: ${url}`);

    // Check if this is a blog listing page (e.g., ends with /blogs/, /blog/, or contains /page/)
    const isBlogListing = /\/blogs?\/?$|\/blogs?\/page\/\d+\/?$/.test(
      parsedUrl.pathname
    );

    if (isBlogListing) {
      console.log("Detected blog listing page, extracting article links...");
      try {
        const articleLinks = await extractArticleLinks(url);

        if (articleLinks.length === 0) {
          throw new Error("No article links found on the page");
        }
        const articlesToScrape = articleLinks.slice(0, 5);
        console.log(`Scraping ${articlesToScrape.length} articles...`);

        const scrapedArticles = [];

        for (const articleUrl of articlesToScrape) {
          try {
            const existingArticle = await Article.findOne({ url: articleUrl });
            if (existingArticle) {
              console.log(`Article already exists: ${articleUrl}`);
              scrapedArticles.push(existingArticle);
              continue;
            }

            const article = await scrapeArticle(articleUrl);
            if (article && article.content) {
              const savedArticle = new Article({
                title: article.title?.trim() || "Untitled Article",
                content: article.content.trim(),
                author: article.author?.trim() || "Unknown Author",
                image: article.image,
                url: articleUrl,
                source: parsedUrl.hostname,
                publishedAt: article.publishedAt || new Date(),
              });

              await savedArticle.save();
              console.log(
                `Successfully scraped: ${
                  savedArticle.title?.substring(0, 50) || "Untitled"
                }...`
              );
              scrapedArticles.push(savedArticle);
            }
          } catch (error) {
            console.error(
              `Error scraping article ${articleUrl}:`,
              error.message
            );
          }
        }

        if (scrapedArticles.length === 0) {
          throw new Error("Failed to scrape any articles from the listing");
        }

        return res.status(200).json({
          success: true,
          message: `Successfully scraped ${scrapedArticles.length} articles`,
          articles: scrapedArticles,
          isBatch: true,
        });
      } catch (error) {
        console.error("Error processing blog listing:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to process blog listing",
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Internal server error",
        });
      }
    } else {
      try {
        const article = await scrapeArticle(url);

        if (!article || !article.content) {
          throw new Error("No content could be extracted from the URL");
        }
        const existingArticle = await Article.findOne({ url });
        if (existingArticle) {
          console.log("Article already exists in database");
          return res.status(200).json({
            success: true,
            message: "Article already exists",
            article: existingArticle,
          });
        }

        console.log(
          `Successfully scraped: ${
            article.title?.substring(0, 50) || "Untitled"
          }...`
        );

        const savedArticle = new Article({
          title: article.title?.trim() || "Untitled Article",
          content: article.content.trim(),
          author: article.author?.trim() || "Unknown Author",
          image:
            article.image ||
            "https://via.placeholder.com/800x400?text=No+Image",
          url: url,
          source: new URL(url).hostname,
          publishedAt: article.publishedAt || new Date(),
        });

        await savedArticle.save();
        console.log(`Article saved with ID: ${savedArticle._id}`);

        return res.status(201).json({
          success: true,
          message: "Article scraped successfully",
          article: savedArticle,
        });
      } catch (error) {
        console.error("Error processing single article:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to scrape article",
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Internal server error",
        });
      }
    }
  } catch (error) {
    console.error("Error in /scrape route:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

router.post("/scrape/batch", async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ message: "URLs array is required" });
    }

    const results = await scrapeMultipleArticles(urls);
    const savedArticles = [];

    for (const result of results) {
      if (result.success) {
        try {
          const article = new Article(result.data);
          const saved = await article.save();
          savedArticles.push(saved);
        } catch (err) {
          console.error(`[v0] Save error:`, err.message);
        }
      }
    }

    res.status(201).json({
      message: `Scraped and saved ${savedArticles.length} of ${urls.length} articles`,
      articles: savedArticles,
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
