import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Navibar from "@/HomePage/Navibar";
import Footer from "@/HomePage/Footer";
import { BLOG_POSTS } from "@/blogPostsJson";

const CATEGORIES = [
  "All",
  ...Array.from(new Set(BLOG_POSTS.map((p) => p.category))),
];

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
    {children}
  </span>
);

const Tag = ({ children }) => (
  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
    {children}
  </span>
);

const PostCard = ({ post }) => (
  <article className="group rounded-3xl border border-black/5 bg-white/80 shadow-sm overflow-hidden hover:shadow-lg transition">
    <div className="relative">
      <img
        src={post.cover}
        alt={post.title}
        className="h-44 sm:h-52 w-full object-cover group-hover:scale-[1.02] transition duration-500"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      <div className="absolute left-4 top-4 flex gap-2">
        <Badge>{post.category}</Badge>
        <Badge>{post.readTime}</Badge>
      </div>
    </div>

    <div className="p-5 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
        {post.title}
      </h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">
        {post.excerpt}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {post.tags?.slice(0, 3).map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{post.author}</span> •{" "}
          {new Date(post.date).toLocaleDateString()}
        </div>

        <Link
          to={`/blog/${post.id}`}
          className="text-sm font-semibold text-[#0b5351] hover:opacity-80 transition"
        >
          Read →
        </Link>
      </div>
    </div>
  </article>
);

export default function BlogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOG_POSTS.filter((p) => {
      const matchCategory = category === "All" ? true : p.category === category;
      const matchQuery = q
        ? p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
        : true;
      return matchCategory && matchQuery;
    });
  }, [query, category]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      <Navibar />
      <div className="h-24 bg-linear-to-b from-slate-950 " />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-10">
        {/* <div className="rounded-[2.5rem] border border-black/5 bg-white/70 shadow-sm overflow-hidden">
          <div className="relative p-6 sm:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
              <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl" />
              <div className="absolute top-10 right-10 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
            </div>

            <div className="relative">
              <Badge>Tenzy Blog</Badge>
              <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                Articles, tips & skincare guides
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600 text-sm sm:text-base">
                Read quick routines, ingredient explainers, and beauty tips made
                for real life.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
                    <span className="text-slate-400">🔎</span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
                      placeholder="Search articles..."
                    />
                  </div>
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm text-slate-900 outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                      category === c
                        ? "bg-[#0b5351] text-white border-[#0b5351]"
                        : "bg-white/80 text-slate-700 border-black/5 hover:bg-white"
                    }`}
                    type="button"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div> */}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
