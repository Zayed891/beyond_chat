<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Symfony\Component\DomCrawler\Crawler;
use GuzzleHttp\Client;

class ScrapeArticles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:scrape-articles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scrape articles from BeyondChats blog';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        //
        $this->info('Starting to scrape articles from beyondChats..');

        try{
            $client = new Client();
            $response = $client ->get('https://beyondchats.com/blogs/');
            $html = (string) $response->getBody();

            $crawler = new Crawler($html);

            $article = [];
            $crawler-> filter('article, .blog-post, .post-time, [class*="article"]')-> each(function (Crawler $node) use (&$articles){
                try{
                    $title = $node-> filter('h1, h2, h3, [class*="title"]')->first()->text();
                    $url = $node-> filter('a')-> first()-> attr('href');
                    $content = $node->filter('p, [class*="content"], [class*="excerpt"]')->first()-> text();
                    $author = $node-> filter('[class*="author"], .by')-> first()-> text() ?: 'Unknown';

                    if(!str_starts_with($url,'http')){
                        $url = 'https://beyondchats.com' . $url;
                    }

                    $articles[] = [
                        'title' => trim($title),
                        'content' => trim($content),
                        'url' => trim($url),
                        'author' => trim($author),
                        'is_updated' => false,
                    ];
                }catch(\Exception $e){

                }
            });

            $articles = array_slice($articles, 0, 5);

            if(empty($articles)){
                $this-> error('No articles found. Website structure changed.');
                return 1;
            }

            foreach($articles as $articleData){
                Article:: updateOrCreate(
                    ['url' => $articleData['url']],
                    $articleData
                );
            }

            $this-> info('Successfully scraped and saved ' . count($articles) . 'articles!');
            return 0;
        } catch (\Exception $e){
            $this -> error('Error scraping articles: ' . $e->getMessage());
            return 1;
        }
    }
}
