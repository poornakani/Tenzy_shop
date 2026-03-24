import React from "react";
import { Link } from "react-router-dom";
import { assets, linkSections } from "@/const";
import { MapPin, Phone, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 xl:px-28">
        {/* ── Main columns ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-12 py-14 border-b border-zinc-100">
          {/* Brand column */}
          <div className="max-w-xs shrink-0">
            <img className="w-32 mb-5" src={assets.logo} alt="Tenzy" />
            <p className="text-sm text-zinc-500 leading-relaxed mb-6">
              Premium beauty & skincare crafted with care. Designed for
              elegance, comfort, and confidence.
            </p>
            <div className="space-y-2.5 text-sm text-zinc-500">
              <div className="flex items-start gap-2.5">
                <MapPin
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: "#2BB9B4" }}
                />
                <span>221B Baker Street, London, United Kingdom</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={14} className="shrink-0" style={{ color: "#2BB9B4" }} />
                <span>+44 20 7946 0958</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={14} className="shrink-0" style={{ color: "#2BB9B4" }} />
                <span>support@tenzyshop.com</span>
              </div>
            </div>
          </div>

          {/* Link sections */}
          <div className="flex flex-wrap justify-between flex-1 gap-8">
            {linkSections.map((section, index) => (
              <div key={index}>
                <h3
                  className="text-xs font-bold uppercase tracking-[0.15em] mb-4"
                  style={{ color: "#2BB9B4" }}
                >
                  {section.title}
                </h3>
                <ul className="space-y-2.5">
                  {section.links.map((link, i) => (
                    <li key={i}>
                      {link.url.startsWith("http") ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.url}
                          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────── */}
        <div className="py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <p>
            © 2026{" "}
            <span className="font-medium text-zinc-600">
              LondonTech IT Pvt Ltd
            </span>
            . All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link to="/help" className="hover:text-zinc-700 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/help" className="hover:text-zinc-700 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
