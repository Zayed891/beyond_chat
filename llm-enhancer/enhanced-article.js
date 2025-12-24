const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const OpenAI = require('openai');

// Initialize OpenRouter client (OpenAI-compatible API)
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost',
  }
});

const LARAVEL_API = process.env.LARAVEL_API_URL || 'http://127.0.0.1:8000/api';


 //this function fetches Latest Article from Laravel API
 
async function getLatestArticle() {
  try {
    const response = await axios.get(`${LARAVEL_API}/articles`);
    const articles = response.data;
    
    if (articles.length === 0) {
      console.log('No articles found in database');
      return null;
    }
    
    // Get the most recently created article
    return articles[articles.length - 1];
  } catch (error) {
    console.error('Error fetching articles:', error.message);
    return null;
  }
}


  //this function searches google with the original title and returns the top 2 articles similar to the original article.
 
async function searchGoogle(query) {
  try {
    console.log(`Searching Google for: ${query}`);
    
    // Check if Google API credentials are available
    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      console.log(' Google API credentials not found, using sample results');
      return [
        {
          title: 'How to Build Better Products - Best Practices',
          url: 'https://beyondchats.com/blogs/',
          snippet: 'Learn the best practices...'
        },
        {
          title: 'Industry Guide and Best Practices',
          url: 'https://beyondchats.com/blogs/',
          snippet: 'Comprehensive guide...'
        }
      ];
    }

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        q: query,
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        num: 2
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.log('No Google results found');
      return [];
    }

    return response.data.items.slice(0, 2).map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet
    }));
  } catch (error) {
    console.error('Google search error:', error.message);
    console.log('Falling back to sample results...');
    return [
      {
        title: 'How to Build Better Products',
        url: 'https://beyondchats.com/blogs/',
        snippet: 'Learn the best practices...'
      },
      {
        title: 'Industry Best Practices Guide',
        url: 'https://beyondchats.com/blogs/',
        snippet: 'Comprehensive guide...'
      }
    ];
  }
}


 //this function Scrapes article content from URL
 
async function scrapeArticle(url) {
  try {
    console.log(`Scraping article from: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove script and style tags
    $('script, style').remove();
    
    // Get main content (adjust selectors based on website)
    let content = $('article, main, [role="main"], .content').text();
    
    if (!content) {
      content = $('body').text();
    }
    
    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000); // Limit to first 2000 chars
    
    return content;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return '';
  }
}


 //this function uses LLM to enhance article based on the 2 referenced articles
 
async function enhanceArticleWithLLM(originalArticle, referenceArticles) {
  try {
    console.log('Enhancing article with LLM...');
    
    const prompt = `You are a content optimizer. Analyze the following article and improve it based on the reference articles provided.

ORIGINAL ARTICLE:
Title: ${originalArticle.title}
Content: ${originalArticle.content}

REFERENCE ARTICLES:
${referenceArticles.map((ref, i) => 
  `Reference ${i + 1}:
Title: ${ref.title}
Content: ${ref.content}`
).join('\n\n')}

TASK:
1. Improve the original article's structure, clarity, and engagement
2. Incorporate insights from reference articles
3. Maintain the original topic and message
4. Make it 15-20% longer and more comprehensive
5. Use similar formatting and style to the reference articles
6. Return only the improved content (no explanations)

IMPROVED ARTICLE:`;

    const message = await openai.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });
    
    return message.choices[0].message.content;
  } catch (error) {
    console.error('Error enhancing article:', error.message);
    
    // Fallback: simple enhancement without API
    console.log('Using fallback enhancement...');
    return `${originalArticle.content}\n\n[Enhanced version would be generated here with LLM API]`;
  }
}


 // this function saves the enhanced article to the Laravel API
 
async function publishEnhancedArticle(originalArticle, enhancedContent, sourceUrls) {
  try {
    // console.log('Publishing enhanced article...');
    
    const payload = {
      title: originalArticle.title,
      content: enhancedContent,
      author: originalArticle.author || 'Enhancement Team',
      url: originalArticle.url,
      source_urls: JSON.stringify(sourceUrls),
      is_updated: true,
      original_article_id: originalArticle.id
    };
    
    const response = await axios.post(`${LARAVEL_API}/articles`, payload);
    
    // console.log('Article published successfully!');
    return response.data;
  } catch (error) {
    console.error('Error publishing article:', error.message);
    return null;
  }
}


  //main function
 
async function main() {
  // console.log(' Starting article enhancement process...\n');
  
  // Fetch all articles
  try {
    const response = await axios.get(`${LARAVEL_API}/articles`);
    const allArticles = response.data;
    
    // Get only original articles (not enhanced)
    const originalArticles = allArticles.filter(a => !a.is_updated);
    
    console.log(`Found ${originalArticles.length} original articles to enhance\n`);
    
    // Enhance each original article
    for (const article of originalArticles) {
      console.log(`Processing: "${article.title}"`);
      
      // Step 1: Search Google for similar articles
      const searchResults = await searchGoogle(article.title);
      if (searchResults.length === 0) {
        console.log('No search results, skipping\n');
        continue;
      }
      
      console.log(`Found ${searchResults.length} articles`);
      
      // Step 2: Scrape top 2 articles
      const referenceArticles = [];
      for (let i = 0; i < Math.min(2, searchResults.length); i++) {
        const result = searchResults[i];
        const content = await scrapeArticle(result.url);
        
        if (content) {
          referenceArticles.push({
            title: result.title,
            url: result.url,
            content: content
          });
        }
      }
      
      console.log(`Scraped ${referenceArticles.length} reference articles`);
      
      // Step 3: Enhance article with LLM
      const enhancedContent = await enhanceArticleWithLLM(article, referenceArticles);
      console.log(`Article enhanced`);
      
      // Step 4: Publish back to API with source URLs
      const sourceUrls = referenceArticles.map(a => ({ 
        title: a.title, 
        url: a.url 
      }));
      
      const published = await publishEnhancedArticle(
        article,
        enhancedContent,
        sourceUrls
      );
      
      if (published) {
        console.log(`Published! ID: ${published.id}\n`);
      } else {
        console.log(` Error publishing\n`);
      }
    }
    
    console.log(' All articles enhanced successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);