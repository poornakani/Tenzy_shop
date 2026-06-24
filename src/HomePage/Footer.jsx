import React, { useState } from "react";
import { Link } from "react-router-dom";
import { assets, linkSections } from "@/const";
import { MapPin, Phone, Mail } from "lucide-react";

const FOOTER_STYLES = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .footer-link {
    transition: all 200ms ease-out;
    position: relative;
    padding-bottom: 2px;
  }

  .footer-link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 1.5px;
    background: #E8522A;
    transition: width 200ms ease-out;
  }

  .footer-link:hover::after {
    width: 100%;
  }

  .reel-item {
    animation: slideUp 0.5s ease-out forwards;
    opacity: 0;
  }

  .reel-item:nth-child(1) { animation-delay: 0.1s; }
  .reel-item:nth-child(2) { animation-delay: 0.15s; }
  .reel-item:nth-child(3) { animation-delay: 0.2s; }
`;

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setEmail("");
      alert("Thanks for subscribing!");
    }
  };

  // Dummy Instagram/Facebook reels with placeholder images
  const reels = [
    { id: 1, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&q=80", likes: "2.5K" },
    { id: 2, image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&q=80", likes: "3.1K" },
    { id: 3, image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&q=80", likes: "1.8K" },
  ];

  return (
    <footer className="bg-gradient-to-b from-white to-slate-50 border-t border-slate-200/50">
      <style>{FOOTER_STYLES}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 mb-8">
          {/* Left Section - Brand & Links */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Brand Info */}
              <div>
                <img className="w-28 sm:w-32 mb-4" src={assets.logo} alt="Tenzy" />
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 max-w-sm">
                  Premium beauty products from 50+ global brands, curated for you.
                </p>

                {/* Contact */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-orange-500 flex-shrink-0" />
                    <span className="text-slate-600">London, UK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-orange-500 flex-shrink-0" />
                    <span className="text-slate-600">+44 20 7946 0958</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-orange-500 flex-shrink-0" />
                    <a href="mailto:support@tenzyshop.com" className="footer-link text-slate-600 text-xs">
                      support@tenzyshop.com
                    </a>
                  </div>
                </div>

                {/* Social Icons */}
                <div className="flex gap-2 mt-4">
                  {["f", "𝕏", "📷", "▶"].map((icon, i) => (
                    <a
                      key={i}
                      href="#"
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-orange-500 text-slate-600 hover:text-white flex items-center justify-center transition-all duration-200 text-xs hover:scale-110"
                    >
                      {icon}
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-6">
                {linkSections.slice(0, 2).map((section, i) => (
                  <div key={i}>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3">
                      {section.title}
                    </h4>
                    <ul className="space-y-2">
                      {section.links.slice(0, 3).map((link, j) => (
                        <li key={j}>
                          {link.url.startsWith("http") ? (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="footer-link text-xs text-slate-600 hover:text-orange-600"
                            >
                              {link.label}
                            </a>
                          ) : (
                            <Link
                              to={link.url}
                              className="footer-link text-xs text-slate-600 hover:text-orange-600"
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
          </div>

          {/* Right Section - Facebook Posts/Reels */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-0.5 h-4 bg-orange-500 rounded" />
              Follow Us
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {reels.map((reel) => (
                <a
                  key={reel.id}
                  href="#"
                  className="reel-item group relative rounded-lg overflow-hidden aspect-square"
                >
                  <img
                    src={reel.image}
                    alt="Post"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="text-center">
                      <div className="text-white font-bold text-sm">❤️</div>
                      <div className="text-white text-xs">{reel.likes}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            <button className="w-full mt-3 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors">
              @tenzybeauty
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <p>
            © 2026 <span className="font-semibold text-slate-900">Tenzy Beauty</span>
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <span className="px-2 py-1 rounded-full bg-slate-100">✓ 100% Authentic</span>
            <span className="px-2 py-1 rounded-full bg-slate-100">🔒 Secure</span>
            <span className="px-2 py-1 rounded-full bg-slate-100">🚚 Free Ship</span>
          </div>
          <div className="flex gap-4">
            <Link to="/help" className="footer-link hover:text-orange-600">
              Privacy
            </Link>
            <Link to="/help" className="footer-link hover:text-orange-600">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
