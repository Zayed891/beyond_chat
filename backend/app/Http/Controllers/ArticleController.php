<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
        $articles = Article :: all();
        return response()-> json($articles);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
        $validated = $request -> validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'url' => 'nullable|url',
            'author' => 'nullable|string',
            'references' => 'nullable|string',
            'is_updated' => 'nullable|boolean',
            'original_article_id' => 'nullable|integer',
            'source_urls' => 'nullable|json',
        ]);

        $article = Article :: create($validated);
        return response()-> json($article,201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
        $article = Article::find($id);

        if (!$article) {
            return response()->json(['error' => 'Article not found'], 404);
        }

        return response()->json($article);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
         $article = Article::find($id);

        if (!$article) {
            return response()->json(['error' => 'Article not found'], 404);
        }

        // Validate input
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'url' => 'sometimes|nullable|url',
            'author' => 'sometimes|nullable|string',
            'references' => 'sometimes|nullable|string',
            'is_updated' => 'sometimes|boolean',
            'source_urls' => 'sometimes|nullable|json',
        ]);

        // Update article
        $article->update($validated);

        return response()->json($article);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
        $article = Article::find($id);

        if (!$article) {
            return response()->json(['error' => 'Article not found'], 404);
        }

        $article->delete();

        return response()->json(['message' => 'Article deleted successfully']);
    }
}
