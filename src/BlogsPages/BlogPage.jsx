import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, Calendar, User, ArrowRight } from "lucide-react";

import Navibar from "@/HomePage/Navibar";
import Footer from "@/HomePage/Footer";
import { BLOG_POSTS } from "@/blogPostsJson";
import { blogsApi } from "@/services/api";

const STYLES = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  .blog-post-card {
    animation: slideInUp 0.6s ease-out forwards;
    opacity: 0;
  }

  .blog-post-card:nth-child(1) { animation-delay: 0.1s; }
  .blog-post-card:nth-child(2) { animation-delay: 0.15s; }
  .blog-post-card:nth-child(3) { animation-delay: 0.2s; }
  .blog-post-card:nth-child(4) { animation-delay: 0.25s; }
  .blog-post-card:nth-child(5) { animation-delay: 0.3s; }
  .blog-post-card:nth-child(6) { animation-delay: 0.35s; }

  .category-pill {
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .category-pill:hover {
    transform: translateY(-2px);
  }

  .blog-card-image {
    transition: transform 500ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .blog-post-card:hover .blog-card-image {
    transform: scale(1.05);
  }

  .badge-glow {
    animation: float 3s ease-in-out infinite;
  }
`;

const Badge = ({ children, icon }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-pink-500/10 px-4 py-2 text-xs font-bold text-orange-600 backdrop-blur-sm">
    {icon && <span className="text-sm">{icon}</span>}
    {children}
  </span>
);

const PostCard = ({ post, index }) => (
  <article className="blog-post-card group h-full rounded-2xl sm:rounded-3xl border border-slate-200/50 bg-white overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col"
    style={{ animationDelay: `${index * 50}ms` }}>
    {/* Image Container */}
    <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
      <img
        src={post.cover}
        alt={post.title}
        className="blog-card-image w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Category Badge */}
      <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 text-orange-600 backdrop-blur-sm shadow-lg">
          {post.category}
        </span>
        {post.readTime && (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 text-slate-700 backdrop-blur-sm shadow-lg">
            ⏱️ {post.readTime}
          </span>
        )}
      </div>
    </div>

    {/* Content */}
    <div className="p-6 sm:p-7 flex flex-col flex-1">
      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug line-clamp-2 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-600 group-hover:to-pink-600 transition-all">
        {post.title}
      </h3>

      {/* Excerpt */}
      <p className="text-slate-600 text-sm sm:text-base leading-relaxed line-clamp-3 mb-4 flex-1">
        {post.excerpt}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-5">
        {post.tags?.slice(0, 3).map((t) => (
          <span
            key={t}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-50 to-pink-50 text-orange-700 border border-orange-200/50 hover:border-orange-300 transition"
          >
            #{t}
          </span>
        ))}
      </div>

      {/* Meta Info */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-slate-400" />
            <span className="font-medium text-slate-700">{post.author}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-400" />
            <span>{post.date ? new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date"}</span>
          </div>
        </div>

        {/* Read More Link */}
        <Link
          to={`/blog/${post.id}`}
          className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-lg hover:shadow-orange-500/40 transition-all group-hover:scale-110"
          title="Read article"
        >
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  </article>
);

export default function BlogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [dynamicPosts, setDynamicPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await blogsApi.getPublished(1, 100);
        const posts = response?.data || response?.response || [];
        setDynamicPosts(Array.isArray(posts) ? posts.filter(p => p.published) : []);
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // Merge static and dynamic posts, preferring dynamic posts by ID
  const allPosts = useMemo(() => {
    const dynamicIds = new Set(dynamicPosts.map(p => p.id));
    const combined = [
      ...dynamicPosts,
      ...BLOG_POSTS.filter(p => !dynamicIds.has(p.id))
    ];
    return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [dynamicPosts]);

  // Update categories to include dynamic ones
  const CATEGORIES = useMemo(() => [
    "All",
    ...Array.from(new Set(allPosts.map((p) => p.category))),
  ], [allPosts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPosts.filter((p) => {
      const matchCategory = category === "All" ? true : p.category === category;
      const matchQuery = q
        ? p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
        : true;
      return matchCategory && matchQuery;
    });
  }, [query, category, allPosts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-orange-50/30">
      <style>{STYLES}</style>
      <Navibar />

      {/* Hero Section */}
      <div className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-200/30 to-pink-200/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-200/20 to-cyan-200/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex justify-center mb-6">
              <Badge icon="✨">Tenzy Beauty Blog</Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
              <span className="block text-slate-900 mb-2">Beauty Tips & Expert</span>
              <span className="block bg-gradient-to-r from-orange-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                Skincare Guides
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
              Discover curated beauty routines, ingredient breakdowns, and expert skincare tips from our community of beauty enthusiasts.
            </p>

            {/* Search & Filter Section */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles, tips, ingredients..."
                  className="w-full pl-12 pr-5 py-4 rounded-full border-2 border-slate-200/50 bg-white/80 backdrop-blur-sm focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 text-slate-900 placeholder-slate-500 shadow-lg hover:border-slate-300/50 transition-all"
                />
              </div>

              {/* Category Buttons */}
              <div className="flex flex-wrap justify-center gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`category-pill px-5 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all ${
                      category === c
                        ? "bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg shadow-orange-600/30 scale-105"
                        : "bg-white/70 text-slate-700 border-2 border-slate-200/50 hover:border-orange-300/50 hover:bg-white/90"
                    }`}
                    type="button"
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Results Count */}
              {!loading && (
                <p className="text-sm text-slate-500 font-medium">
                  {filtered.length} article{filtered.length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-4 border-slate-200 border-t-orange-500 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Loading beautiful articles...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filtered.length === 0 && (
            <div className="py-20 text-center px-6 rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No articles found</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Try adjusting your search or category filters to discover more beauty tips and skincare guides.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-orange-600 to-pink-600 text-white font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
              >
                Reset Filters
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Blog Grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filtered.map((post, index) => (
                <PostCard key={post.id} post={post} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      {!loading && filtered.length > 0 && (
        <div className="border-t border-slate-200/50 bg-gradient-to-br from-orange-50/50 to-pink-50/50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Ready to Transform Your Skincare Routine?
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Explore our curated collection of premium beauty products to complement your newly learned skincare tips.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-orange-600 to-pink-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-orange-600/40 transition-all hover:scale-105"
            >
              Shop Our Collection
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
