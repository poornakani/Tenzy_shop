import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Navibar from "@/HomePage/Navibar";
import Footer from "@/HomePage/Footer";
import { BLOG_POSTS } from "@/blogPostsJson";

const ArticleBlock = ({ block }) => {
  if (block.type === "h2") {
    return (
      <h2 className="mt-8 text-2xl font-extrabold text-slate-900">
        {block.text}
      </h2>
    );
  }
  if (block.type === "p") {
    return <p className="mt-4 text-slate-700 leading-relaxed">{block.text}</p>;
  }
  if (block.type === "ul") {
    return (
      <ul className="mt-4 list-disc pl-6 space-y-2 text-slate-700">
        {block.items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "ol") {
    return (
      <ol className="mt-4 list-decimal pl-6 space-y-2 text-slate-700">
        {block.items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ol>
    );
  }
  return null;
};

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
    {children}
  </span>
);

export default function BlogDetails() {
  const { id } = useParams();

  const post = useMemo(() => BLOG_POSTS.find((p) => p.id === id), [id]);
  const related = useMemo(() => {
    if (!post) return [];
    return BLOG_POSTS.filter(
      (p) => p.id !== post.id && p.category === post.category
    ).slice(0, 3);
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Navibar />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 pt-12">
          <div className="rounded-3xl border border-black/5 bg-white p-8">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Article not found
            </h1>
            <p className="mt-2 text-slate-600">
              Please go back to the blog list.
            </p>
            <Link
              to="/blog"
              className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navibar />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-14">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            to="/blog"
            className="font-semibold text-slate-700 hover:text-slate-900"
          >
            Blog
          </Link>
          <span>•</span>
          <span className="truncate">{post.title}</span>
        </div>

        {/* Header */}
        <div className="mt-5 rounded-[2.5rem] overflow-hidden border border-black/5 bg-white/70 shadow-sm">
          <div className="relative">
            <img
              src={post.cover}
              alt={post.title}
              className="h-60 sm:h-80 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute left-6 top-6 flex flex-wrap gap-2">
              <Badge>{post.category}</Badge>
              <Badge>{post.readTime}</Badge>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                {post.title}
              </h1>
              <p className="mt-2 text-white/85 text-sm sm:text-base max-w-2xl">
                {post.excerpt}
              </p>
              <div className="mt-4 text-xs text-white/80">
                {post.author} • {new Date(post.date).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-10 bg-white/80">
            <div className="prose prose-slate max-w-none">
              {post.content?.map((block, i) => (
                <ArticleBlock key={i} block={block} />
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10 rounded-3xl border border-black/5 bg-gradient-to-br from-[#0b5351] to-[#1b7a74] p-6 text-white">
              <h3 className="text-lg font-extrabold">
                Want product recommendations?
              </h3>
              <p className="mt-1 text-sm text-white/85">
                Visit our Help Center or browse products tailored to your skin
                type.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/help"
                  className="inline-flex justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-white/90 transition"
                >
                  Help Center
                </Link>
                <Link
                  to="/products"
                  className="inline-flex justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 transition"
                >
                  Shop Products
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-extrabold text-slate-900">
              Related articles
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.id}
                  to={`/blog/${p.id}`}
                  className="rounded-3xl border border-black/5 bg-white/80 shadow-sm overflow-hidden hover:shadow-lg transition"
                >
                  <img
                    src={p.cover}
                    alt={p.title}
                    className="h-28 w-full object-cover"
                  />
                  <div className="p-4">
                    <div className="text-xs text-slate-500">
                      {p.category} • {p.readTime}
                    </div>
                    <div className="mt-1 font-bold text-slate-900 line-clamp-2">
                      {p.title}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
