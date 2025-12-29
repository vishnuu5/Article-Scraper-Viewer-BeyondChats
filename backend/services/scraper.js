import axios from "axios";
import * as cheerio from "cheerio";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Cache-Control": "max-age=0",
};

const CONTENT_SELECTORS = [
  "article",
  "main",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".post-body",
  ".article-body",
  ".content",
  "section",
  "div.content",
  "div.article",
  "div.post",
];

// Timeout and retry configuration
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  const { timeout = REQUEST_TIMEOUT, ...axiosOptions } = options;

  try {
    const source = axios.CancelToken.source();
    const timeoutId = setTimeout(
      () => source.cancel(`Request timed out after ${timeout}ms`),
      timeout
    );

    const response = await axios({
      url,
      ...axiosOptions,
      cancelToken: source.token,
      headers: { ...DEFAULT_HEADERS, ...(axiosOptions.headers || {}) },
      timeout: timeout + 1000,
      validateStatus: (status) => status >= 200 && status < 500,
      responseType: "text",
      responseEncoding: "utf8",
      maxRedirects: 5,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (retries <= 0) throw error;

    if (error.response) {
      if (error.response.status === 404) {
        throw new Error("The requested article was not found (404)");
      }
      if (error.response.status >= 500) {
        throw new Error("The website is currently unavailable (server error)");
      }
    } else if (error.request) {
      console.warn(
        `[Scraper] No response received, retrying... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    } else if (error.code === "ECONNABORTED") {
      console.warn(
        `[Scraper] Request timed out, retrying... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(
        url,
        { ...options, timeout: timeout * 1.5 },
        retries - 1
      );
    }

    throw error;
  }
}

function extractContent($) {
  const UNWANTED = [
    "script",
    "style",
    "iframe",
    "noscript",
    "nav",
    "header",
    "footer",
    ".menu",
    ".sidebar",
    ".comments",
    ".ad",
    ".advertisement",
    ".social-share",
    ".related-posts",
    ".popup",
    ".modal",
    "form",
    "button",
    "input",
    "select",
    "textarea",
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    ".meta",
    ".tags",
    ".categories",
    ".author-bio",
    'link[rel="stylesheet"]',
    "meta",
  ].join(", ");

  $(UNWANTED).remove();

  let bestContent = "";

  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector).first();
    if (element.length > 0) {
      element.find(UNWANTED).remove();
      element.find("br").replaceWith("\n");
      element.find("p, h1, h2, h3, h4, h5, h6, div, li").after("\n");

      const text = element.text();
      if (text.trim().length > 100) {
        bestContent = text;
        break;
      }
    }
  }
  if (!bestContent) {
    const body = $("body");
    body.find(UNWANTED).remove();
    body.find("br").replaceWith("\n");
    body.find("p, h1, h2, h3, h4, h5, h6, div, li").after("\n");
    bestContent = body.text();
  }

  return bestContent
    .replace(/<[^>]*>/g, "") // Remove any remaining tags
    .replace(/&[a-z0-9]+;/gi, " ") // Remove HTML entities
    .replace(/\s+/g, " ") // Collapse whitespace
    .replace(/\n+/g, "\n")
    .trim();
}

/**
 * Extracts article links from a blog listing page
 * @param {string} url - The URL of the blog listing page
 * @returns {Promise<string[]>} - Array of article URLs
 */
export const extractArticleLinks = async (url) => {
  console.log(`[Scraper] Extracting article links from: ${url}`);

  try {
    const { data } = await fetchWithRetry(url);
    const $ = cheerio.load(data);
    const articleLinks = new Set();
    const baseUrl = new URL(url).origin;

    const linkSelectors = [
      'a[href*="/blog/"]',
      'a[href*="/blogs/"]',
      "article a[href]",
      ".post a[href]",
      ".article a[href]",
      ".entry-title a[href]",
      "h2 a[href]",
      "h3 a[href]",
      ".post-title a[href]",
      ".post-header a[href]",
      'a[href*="/article/"]',
      'a[href*="/post/"]',
      'a[href*="/news/"]',
    ];

    for (const selector of linkSelectors) {
      $(selector).each((i, el) => {
        try {
          const href = $(el).attr("href");
          if (href && !href.startsWith("#")) {
            let absoluteUrl;
            try {
              absoluteUrl = new URL(href, url).toString();
              if (new URL(absoluteUrl).origin === baseUrl) {
                if (
                  !absoluteUrl.includes("/author/") &&
                  !absoluteUrl.includes("/tag/") &&
                  !absoluteUrl.includes("/category/") &&
                  !absoluteUrl.includes("/page/") &&
                  absoluteUrl !== url
                ) {
                  articleLinks.add(absoluteUrl);
                }
              }
            } catch (e) {
              console.warn(`[Scraper] Invalid URL: ${href}`);
            }
          }
        } catch (e) {
          console.warn(
            `[Scraper] Error processing link with selector ${selector}:`,
            e.message
          );
        }
      });
    }

    const links = Array.from(articleLinks);
    console.log(`[Scraper] Found ${links.length} article links`);

    if (links.length === 0) {
      console.warn("[Scraper] No article links found on the page");
      $("a[href]").each((i, el) => {
        const href = $(el).attr("href");
        if (href && !href.startsWith("#") && !href.startsWith("http")) {
          try {
            const absoluteUrl = new URL(href, url).toString();
            if (new URL(absoluteUrl).origin === baseUrl) {
              articleLinks.add(absoluteUrl);
            }
          } catch (e) {}
        }
      });
    }

    return Array.from(articleLinks);
  } catch (error) {
    console.error(
      `[Scraper] Error extracting article links from ${url}:`,
      error
    );
    if (error.response) {
      throw new Error(
        `Server responded with status ${error.response.status}: ${error.message}`
      );
    } else if (error.request) {
      throw new Error("No response received from the server");
    } else {
      throw new Error(`Failed to extract article links: ${error.message}`);
    }
  }
};

/**
 * Scrapes a single article URL for metadata and content
 * @param {string} url - The URL of the article to scrape
 * @returns {Promise<Object>} - The scraped article data
 */
export const scrapeArticle = async (url) => {
  console.log(`[Scraper] Starting scrape of: ${url}`);

  try {
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      throw new Error(
        "Invalid URL provided. Please include http:// or https://"
      );
    }
    const { data, status, headers } = await fetchWithRetry(url, {
      timeout: REQUEST_TIMEOUT,
    });

    console.log(`[Scraper] Received response (${status}) from: ${url}`);
    const contentType = headers["content-type"] || "";
    if (!contentType.includes("text/html")) {
      throw new Error("The URL does not appear to be an HTML page");
    }

    const $ = cheerio.load(data);
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").first().text() ||
      $("h1").first().text() ||
      $("h2").first().text() ||
      "Untitled Article";

    let content = extractContent($);

    content = content.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();

    if (!content || content.length < 50) {
      console.warn("[Scraper] Warning: Extracted content seems too short");
    }

    const author =
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      $(".author").first().text() ||
      $(".byline").first().text() ||
      $(".author-name").first().text() ||
      "Unknown Author";
    const image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[property="og:image:url"]').attr("content") ||
      $("article img").first().attr("src") ||
      $("img").first().attr("src") ||
      "https://via.placeholder.com/800x400?text=No+Image+Found";

    let absoluteImage;
    try {
      absoluteImage = new URL(image, url).toString();
    } catch (e) {
      console.warn(`[Scraper] Invalid image URL: ${image}`, e.message);
      absoluteImage = "https://via.placeholder.com/800x400?text=No+Image+Found";
    }

    console.log(
      `[Scraper] Successfully scraped: "${title.substring(0, 60)}${
        title.length > 60 ? "..." : ""
      }"`
    );

    return {
      title: title.trim(),
      content: content.trim(),
      author: author.trim(),
      image: absoluteImage,
      sourceUrl: url,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Scraper] Error scraping ${url}:`, error.message);
    throw new Error(`Failed to scrape article: ${error.message}`);
  }
};

/**
 * Scrapes multiple article URLs in parallel
 * @param {string[]} urls - Array of URLs to scrape
 * @returns {Promise<Array>} - Array of results (success/failure)
 */
export const scrapeMultipleArticles = async (urls) => {
  const scrapePromises = urls.map(async (url) => {
    try {
      const data = await scrapeArticle(url);
      return { url, success: true, data };
    } catch (error) {
      return { url, success: false, error: error.message };
    }
  });

  return Promise.all(scrapePromises);
};
