import axios from "axios";
import * as cheerio from "cheerio";

export const scrapeArticle = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const $ = cheerio.load(data);

    const title = $("h1").first().text().trim() || $("title").text().trim();
    const content =
      $("article").text().trim() ||
      $("main").text().trim() ||
      $("body").text().trim();
    const author = $('meta[name="author"]').attr("content") || "Unknown";

    return {
      title,
      content: content.substring(0, 5000), // Limit content size
      author,
      url,
      source: new URL(url).hostname,
      publishedAt: new Date(),
    };
  } catch (error) {
    console.error(`[v0] Scraping error for ${url}:`, error.message);
    throw new Error("Failed to scrape article");
  }
};
