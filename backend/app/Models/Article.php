<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    //
    protected $fillable = [
        'title',
        'content',
        'url',
        'author',
        'references',
        'is_updated',
        'original_article_id',
        'source_urls',
    ];
}
