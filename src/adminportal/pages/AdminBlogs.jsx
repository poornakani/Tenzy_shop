import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, Search, ChevronDown, Calendar, X, Sparkles, TrendingUp } from "lucide-react";
import { blogsApi } from "@/services/api";
import { useToast } from "@/Context/ToastContext";

const STYLES = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
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

  .blog-card {
    animation: slideInUp 0.5s ease-out forwards;
    transition: all 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .blog-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(232, 82, 42, 0.15);
  }

  .modal-backdrop {
    animation: fadeIn 200ms ease-out;
  }

  .modal-content {
    animation: slideInUp 300ms ease-out;
  }
`;

const AdminBlogs = () => {
  const { showToast } = useToast();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "Skincare",
    author: "Tenzy Editorial",
    tags: "",
    cover: "",
    published: false,
  });

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await blogsApi.getAll(1, 100);
      const data = response?.data || response?.response || [];
      setBlogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
      showToast({ title: "Error", message: "Failed to load blogs", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (blog = null) => {
    if (blog) {
      setFormData({
        title: blog.title || "",
        excerpt: blog.excerpt || "",
        content: blog.content || "",
        category: blog.category || "Skincare",
        author: blog.author || "Tenzy Editorial",
        tags: (blog.tags || []).join(", "),
        cover: blog.cover || "",
        published: blog.published || false,
      });
      setEditingBlog(blog);
    } else {
      setFormData({
        title: "",
        excerpt: "",
        content: "",
        category: "Skincare",
        author: "Tenzy Editorial",
        tags: "",
        cover: "",
        published: false,
      });
      setEditingBlog(null);
    }
    setShowModal(true);
  };

  const handleSaveBlog = async () => {
    if (!formData.title.trim() || !formData.excerpt.trim() || !formData.content.trim()) {
      showToast({ title: "Error", message: "Please fill in all required fields", type: "error" });
      return;
    }

    try {
      const payload = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        category: formData.category,
        author: formData.author,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        cover: formData.cover,
        published: formData.published,
      };

      if (editingBlog) {
        await blogsApi.update(editingBlog.id, payload);
        showToast({ title: "Success", message: "Blog updated successfully" });
      } else {
        await blogsApi.create(payload);
        showToast({ title: "Success", message: "Blog created successfully" });
      }

      setShowModal(false);
      fetchBlogs();
    } catch (error) {
      console.error("Failed to save blog:", error);
      showToast({ title: "Error", message: "Failed to save blog", type: "error" });
    }
  };

  const handleDeleteBlog = async (id) => {
    if (!window.confirm("Are you sure you want to delete this blog?")) return;
    try {
      await blogsApi.delete(id);
      showToast({ title: "Success", message: "Blog deleted successfully" });
      fetchBlogs();
    } catch (error) {
      console.error("Failed to delete blog:", error);
      showToast({ title: "Error", message: "Failed to delete blog", type: "error" });
    }
  };

  const handleTogglePublish = async (blog) => {
    try {
      if (blog.published) {
        await blogsApi.unpublish(blog.id);
        showToast({ title: "Success", message: "Blog unpublished" });
      } else {
        await blogsApi.publish(blog.id);
        showToast({ title: "Success", message: "Blog published" });
      }
      fetchBlogs();
    } catch (error) {
      console.error("Failed to toggle publish status:", error);
      showToast({ title: "Error", message: "Failed to update blog status", type: "error" });
    }
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || (filterStatus === "published" ? blog.published : !blog.published);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 sm:p-8">
      <style>{STYLES}</style>
      <div className="max-w-7xl mx-auto">
        {/* Header Hero */}
        <div className="mb-12">
          <div className="relative rounded-3xl overflow-hidden mb-8">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-transparent blur-3xl" />

            <div className="relative p-8 sm:p-12">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500">
                      <Sparkles size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-orange-400 tracking-wider uppercase">Content Hub</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
                    Beauty Tips <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">&amp; Blog</span>
                  </h1>
                  <p className="text-slate-300 text-lg max-w-2xl">Share daily skincare guides, beauty tips, and expert advice with your community. Create engaging content that drives engagement.</p>
                </div>

                <button
                  onClick={() => handleOpenModal()}
                  className="mt-4 sm:mt-0 flex items-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105 whitespace-nowrap"
                >
                  <Plus size={22} />
                  <span className="hidden sm:inline">New Post</span>
                  <span className="sm:hidden">Post</span>
                </button>
              </div>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-6">
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Posts</p>
                  <p className="text-2xl font-bold text-white">{blogs.length}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Published</p>
                  <p className="text-2xl font-bold text-green-400">{blogs.filter(b => b.published).length}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Drafts</p>
                  <p className="text-2xl font-bold text-amber-400">{blogs.filter(b => !b.published).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 relative group">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-400 transition" />
              <input
                type="text"
                placeholder="Search by title, author, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
              />
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-5 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 appearance-none pr-10 transition cursor-pointer font-medium"
              >
                <option value="all">All Posts</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Blog List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 mb-4 animate-spin">
                <div className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-orange-500" />
              </div>
              <p className="text-slate-400 text-lg">Loading your beautiful posts...</p>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-3xl border border-slate-700/50 bg-slate-800/30">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-orange-400" />
              </div>
              <p className="text-xl font-bold text-white mb-2">No posts yet</p>
              <p className="text-slate-400 mb-6">Start creating your first beauty tip to inspire your community</p>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/40 transition"
              >
                <Plus size={20} />
                Create First Post
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBlogs.map((blog, index) => (
                <div
                  key={blog.id}
                  className="blog-card p-6 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-orange-500/50 backdrop-blur-sm"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-6">
                    {/* Cover Image */}
                    {blog.cover && (
                      <div className="hidden md:block shrink-0">
                        <img
                          src={blog.cover}
                          alt={blog.title}
                          className="w-24 h-24 rounded-xl object-cover border border-slate-600/50"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2 leading-tight line-clamp-2">{blog.title}</h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                              blog.published
                                ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30"
                                : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30"
                            }`}>
                              {blog.published ? "🟢 Published" : "🟡 Draft"}
                            </span>
                            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/50">
                              {blog.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">{blog.excerpt}</p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {blog.tags && blog.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                        <span className="font-medium text-slate-300">{blog.author}</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          <span>{blog.date ? new Date(blog.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date"}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 border-t border-slate-700/50">
                        <button
                          onClick={() => handleTogglePublish(blog)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                            blog.published
                              ? "bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30"
                              : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 border border-slate-600/50"
                          }`}
                          title={blog.published ? "Unpublish" : "Publish"}
                        >
                          {blog.published ? <Eye size={16} /> : <EyeOff size={16} />}
                          <span className="text-xs">{blog.published ? "Published" : "Publish"}</span>
                        </button>

                        <button
                          onClick={() => handleOpenModal(blog)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 font-medium transition-all text-xs"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteBlog(blog.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 font-medium transition-all text-xs ml-auto"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="modal-content bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700/50">
            {/* Modal Header */}
            <div className="sticky top-0 p-6 sm:p-8 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">
                  {editingBlog ? "✏️ Edit Post" : "✨ Create Post"}
                </h2>
                <p className="text-sm text-slate-400">{editingBlog ? "Update your beauty tips" : "Share your beauty wisdom"}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition text-lg font-medium"
                  placeholder="Enter an engaging blog title..."
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Excerpt</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition resize-none"
                  rows="3"
                  placeholder="Brief summary that appears in listings..."
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition font-mono text-sm resize-none"
                  rows="8"
                  placeholder="Write your detailed beauty tip or blog content here..."
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Cover Image URL</label>
                <input
                  type="url"
                  value={formData.cover}
                  onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.cover && (
                  <div className="mt-4 rounded-2xl overflow-hidden border border-slate-600/50">
                    <img src={formData.cover} alt="Cover preview" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition cursor-pointer appearance-none font-medium"
                  >
                    <option>Skincare</option>
                    <option>Makeup</option>
                    <option>Wellness</option>
                    <option>Tips & Tricks</option>
                    <option>Ingredients</option>
                  </select>
                </div>

                {/* Author */}
                <div>
                  <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition font-medium"
                    placeholder="Your name..."
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                  placeholder="skincare, routine, beginner-friendly"
                />
              </div>

              {/* Publish Toggle */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/30 flex items-center gap-4">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="w-5 h-5 rounded-lg cursor-pointer accent-orange-500"
                />
                <label htmlFor="published" className="text-sm font-semibold text-white cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={formData.published ? "text-green-400" : "text-amber-400"}>
                      {formData.published ? "✓" : "○"}
                    </span>
                    Publish immediately
                  </div>
                  <p className="text-xs text-slate-400 ml-6">Make this post visible to all customers</p>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 p-6 sm:p-8 border-t border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 rounded-xl border border-slate-600/50 text-slate-300 font-semibold hover:bg-slate-700/50 hover:border-slate-500/50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBlog}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold hover:shadow-2xl hover:shadow-orange-500/40 transition hover:scale-105"
              >
                {editingBlog ? "🔄 Update Post" : "✨ Create Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlogs;
