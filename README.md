# BeyondChats Full-Stack Web Developer Internship Assignment

A comprehensive article management system with web scraping capabilities, built with modern web technologies.

## Project Overview

This application allows users to scrape articles from any URL, store them in a MongoDB database, and manage them through a responsive web interface. The system includes full CRUD operations, batch scraping capabilities, and a clean, intuitive UI for viewing and managing articles.

## Tech Stack

### Frontend

- **Vite** - Fast build tool and dev server
- **React.js** - UI library (JavaScript)
- **TailwindCSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Cheerio** - Web scraping library
- **Axios** - HTTP client for fetching web pages

## Features

### Phase 1: Core Functionality

- **CRUD Operations**: Create, Read, Update, Delete articles
- **Web Scraping**: Extract article content from any URL
- **MongoDB Integration**: Persistent data storage with Mongoose

### Phase 2: Advanced Features

- **Batch Scraping**: Scrape multiple articles simultaneously
- **Smart Content Extraction**: Automatic detection of title, content, author, and metadata
- **Error Handling**: Robust error management for failed scraping attempts

### Phase 3: User Interface

- **Responsive Design**: Mobile-first design that works on all devices
- **Article Grid/List View**: Toggle between grid and list layouts
- **Modal Interactions**: View, edit, and scrape articles in modal dialogs
- **Real-time Updates**: Instant UI updates after CRUD operations

## Git Clone

```bash
https://github.com/vishnuu5/Article-Scraper-Viewer-BeyondChats.git
```

## Deplyoment

**View Project Demo**

[View Project]()

## Installation & Setup

### Backend Setup

1. Navigate to the Backend directory:

```bash
cd Backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env
```

4. Update the `.env` file with your MongoDB connection string:

```env
MONGODB_URI=mongodb://localhost:27017/beyondchats
PORT=5000
```

5. Start the backend server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the Frontend directory:

```bash
cd Frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend application will run on `http://localhost:3000`

## API Endpoints

### Articles CRUD

#### Get All Articles

```
GET /api/articles
Response: Array of article objects
```

#### Create Article

```
POST /api/articles
Body: { title, content, author, url, source, publishedAt }
Response: Created article object
```

#### Update Article

```
PUT /api/articles/:id
Body: { title, content, author, url, source }
Response: Updated article object
```

#### Delete Article

```
DELETE /api/articles/:id
Response: { message: "Article deleted" }
```

### Scraping Endpoints

#### Scrape Single Article

```
POST /api/articles/scrape
Body: { url: "https://example.com/article" }
Response: Scraped and saved article object
```

#### Batch Scrape Articles

```
POST /api/articles/scrape/batch
Body: { urls: ["url1", "url2", ...] }
Response: { message, articles, results }
```

## Usage Guide

### Scraping an Article

1. Click the "**+ Scrape Article**" button in the header
2. Enter the URL of the article you want to scrape
3. Click "**Scrape Article**"
4. The article will be automatically extracted and saved to the database

### Viewing Articles

- Articles are displayed in a **grid layout** by default
- Click "**View**" on any article card to see the full content in a modal
- Toggle between **Grid View** and **List View** using the button in the header

### Managing Articles

- **Edit**: Click the "Edit" button to modify article details
- **Delete**: Click the "Delete" button to remove an article (confirmation required)
- All changes are immediately reflected in the UI

## Design Features

- **Color Scheme**: Professional blue and gray palette
- **Typography**: Clean, readable fonts with proper hierarchy
- **Responsive Grid**: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)
- **Hover Effects**: Subtle shadows and transitions for better UX
- **Modal Overlays**: Non-intrusive modals for detailed views and editing

## Testing the Application

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Try scraping an article from a news website
4. Test CRUD operations on the scraped articles
5. Test responsive design by resizing the browser window

# Known Limitations

- Some websites may block scraping attempts
- Paywalled content cannot be scraped
- JavaScript-heavy websites may not be fully scraped (requires headless browser)
- Rate limiting not implemented (should be added for production use)

## Security Considerations

- Input validation on all API endpoints
- URL validation for scraping requests
- CORS enabled for cross-origin requests
- Environment variables for sensitive configuration
- Error messages sanitized to prevent information leakage

## License

This project is created for the BeyondChats Full-Stack Web Developer Internship Assignment.
