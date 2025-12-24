import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
      const response = await axios.get(`${apiUrl}/articles`)
      setArticles(response.data)
    } catch (err) {
      setError('Failed to fetch articles. Make sure Laravel is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading articles...</div>
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>
  if (articles.length === 0) return <div className="p-8 text-center">No articles found</div>

  const originalArticles = articles.filter(a => !a.is_updated)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow p-8 flex flex-col justify-center text-center">
        <h1 className="text-4xl font-bold text-gray-600 mb-2 ">Article Hub</h1>
        <p className="text-gray-300">Original and Enhanced Articles</p>
      </header>

      <div className="max-w-6xl mx-auto p-8">
        {/* Articles List */}
        <div className="flex flex-col gap-8">
          {originalArticles.map((article) => {
            const enhancedArticle = articles.find(a => a.original_article_id === article.id)

            return (
              <div 
                key={article.id} 
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                {/* Two Column Layout with Flexbox */}
                <div className="flex flex-col md:flex-row">
                  
                  {/* Left: Original Article */}
                  <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-gray-200 min-w-0">
                    <span className="inline-block px-3 py-1 rounded text-sm font-bold mb-4 bg-blue-100 text-blue-800">
                       Original
                    </span>

                    <h2 className="text-xl font-bold mb-2 break-words">{article.title}</h2>

                    {article.author && (
                      <p className="text-sm text-gray-600 mb-3 italic">By {article.author}</p>
                    )}

                    <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                      {article.content.substring(0, 280)}...
                    </p>

                    {article.url && (
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        🔗 View Original
                      </a>
                    )}
                  </div>

                  {/* Right: Enhanced Article */}
                  <div className="flex-1 p-6 bg-amber-50 min-w-0">
                    <span className="inline-block px-3 py-1 rounded text-sm font-bold mb-4 bg-amber-100 text-amber-800">
                       Enhanced
                    </span>

                    {enhancedArticle ? (
                      <>
                        <h2 className="text-xl font-bold mb-2 break-words">{article.title}</h2>

                        <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                          {enhancedArticle.content.substring(0, 280)}...
                        </p>

                        {/* Display source URLs */}
                        {enhancedArticle.source_urls && (
                          <div className="bg-gray-100 p-3 rounded text-xs mt-4">
                            <p className="font-bold mb-2">Sources:</p>
                            <div className="space-y-2">
                              {(() => {
                                try {
                                  const sources = typeof enhancedArticle.source_urls === 'string' 
                                    ? JSON.parse(enhancedArticle.source_urls) 
                                    : enhancedArticle.source_urls;
                                  
                                  if (Array.isArray(sources)) {
                                    return sources.map((source, idx) => (
                                      <div key={idx}>
                                        <a 
                                          href={source.url}
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline break-words text-xs"
                                          title={source.title}
                                        >
                                          {idx + 1}. {source.title}
                                        </a>
                                      </div>
                                    ));
                                  }
                                } catch (e) {
                                  return <p className="text-red-600 text-xs">Error parsing sources</p>;
                                }
                              })()}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">No enhanced version available</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default App
