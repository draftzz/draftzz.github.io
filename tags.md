---
layout: default
title: Tags
permalink: /tags/
---

<style>
  .tags-page { padding: 2rem 0 4rem; }
  .tags-cloud { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.5rem 0 3rem; }
  .tag-cloud-link {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 999px;
    padding: .4rem 1rem; font-family: var(--mono); font-size: .85rem;
    color: var(--text); transition: all .15s;
  }
  .tag-cloud-link:hover { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .tag-cloud-link .count { color: var(--muted); margin-left: .35rem; font-size: .75rem; }
  .tag-cloud-link:hover .count { color: var(--bg); }
  .tag-section { margin-bottom: 3rem; }
  .tag-section h2 {
    font-family: var(--mono); color: var(--accent); font-size: 1.2rem;
    border-bottom: 1px solid var(--border); padding-bottom: .5rem; margin-bottom: 1rem;
  }
  .tag-section ul { list-style: none; padding: 0; }
  .tag-section li { padding: .5rem 0; border-bottom: 1px dashed var(--border); }
  .tag-section li a { color: var(--text); }
  .tag-section li a:hover { color: var(--accent); }
  .tag-section .meta { color: var(--muted); font-family: var(--mono); font-size: .8rem; margin-left: .5rem; }
</style>

<section class="tags-page">

<a href="{{ '/' | relative_url }}#writeups" class="back">← all writeups</a>

# <span style="color:var(--accent)">#</span> tags

Browse writeups by technique used.

{% assign all_tags = site.writeups | map: 'techniques' | join: ',' | split: ',' | uniq | sort %}

<div class="tags-cloud">
  {% for tag in all_tags %}
    {% assign trimmed = tag | strip %}
    {% if trimmed != "" %}
    {% assign count = 0 %}
    {% for w in site.writeups %}{% if w.techniques contains trimmed %}{% assign count = count | plus: 1 %}{% endif %}{% endfor %}
    <a href="#{{ trimmed | slugify }}" class="tag-cloud-link">{{ trimmed }}<span class="count">{{ count }}</span></a>
    {% endif %}
  {% endfor %}
</div>

{% for tag in all_tags %}
  {% assign trimmed = tag | strip %}
  {% if trimmed != "" %}
  <div class="tag-section" id="{{ trimmed | slugify }}">
    <h2># {{ trimmed }}</h2>
    <ul>
    {% for w in site.writeups %}
      {% if w.techniques contains trimmed %}
        <li>
          <a href="{{ w.url | relative_url }}">{{ w.title }}</a>
          <span class="meta">· {{ w.platform }} · {{ w.category }} · {{ w.difficulty }}</span>
        </li>
      {% endif %}
    {% endfor %}
    </ul>
  </div>
  {% endif %}
{% endfor %}

</section>
