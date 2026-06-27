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
  .tag-cloud-link:hover {
    background: var(--accent); color: #020304; border-color: var(--accent);
    transform: translateY(-1px); box-shadow: 0 8px 22px rgba(var(--accent-rgb),.22);
  }
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
  .tech-graph {
    position: relative;
    height: 460px;
    margin: 1.5rem 0 2.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: rgba(var(--tint-rgb), .02);
  }
  .tech-graph canvas { display: block; width: 100%; height: 100%; }
  .tech-graph__legend {
    position: absolute; left: .9rem; top: .7rem; margin: 0; display: flex; gap: 1rem;
    font-family: var(--mono); font-size: .72rem; color: var(--muted); pointer-events: none;
  }
  .tech-graph__legend i { font-style: normal; }
  .tech-graph__legend .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: .3rem; vertical-align: middle; }
  .tech-graph__hint {
    position: absolute; right: .9rem; bottom: .7rem; margin: 0;
    font-family: var(--mono); font-size: .7rem; color: var(--muted); pointer-events: none; text-align: right;
  }
  @media (max-width: 640px) { .tech-graph { height: 380px; } }
</style>

<section class="tags-page">

<a href="{{ '/' | relative_url }}#writeups" class="back">← all writeups</a>

# <span style="color:var(--accent)">#</span> tags

Browse writeups by technique used.

<div class="tech-graph" id="tech-graph" aria-hidden="true">
  <canvas></canvas>
  <p class="tech-graph__legend">
    <i><span class="dot" style="background:var(--accent)"></span>technique</i>
    <i><span class="dot" style="background:var(--accent-2)"></span>writeup</i>
  </p>
  <p class="tech-graph__hint">drag nodes · hover to focus · click to open</p>
</div>

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

<script defer src="{{ '/assets/js/graph.js' | relative_url }}?v={{ site.time | date: '%s' }}"></script>
