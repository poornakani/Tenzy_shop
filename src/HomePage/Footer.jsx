import React from "react";
import { Link } from "react-router-dom";
import { assets, linkSections } from "@/const";

const Footer = () => {
  return (
    <footer className="bg-gray-50 text-gray-600">
      <div className="px-6 md:px-16 lg:px-24 xl:px-32">
        <div className="flex flex-col md:flex-row gap-12 py-14 border-b border-gray-200">
          <div className="max-w-md">
            <img className="w-36 mb-4" src={assets.logo} alt="logo" />
            <p className="text-sm leading-relaxed">
              Premium beauty & skincare crafted with care. Designed for
              elegance, comfort, and confidence.
            </p>

            <div className="mt-4 text-sm text-gray-500 space-y-1">
              <p>📍 221B Baker Street</p>
              <p>London, United Kingdom</p>
              <p>📞 +44 20 7946 0958</p>
              <p>✉️ support@tenzyshop.com</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-between w-full md:w-[55%] gap-8">
            {linkSections.map((section, index) => (
              <div key={index}>
                <h3 className="font-semibold text-gray-900 mb-4">
                  {section.title}
                </h3>

                <ul className="space-y-2 text-sm">
                  {section.links.map((link, i) => (
                    <li key={i}>
                      {link.url.startsWith("http") ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-black transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.url}
                          className="hover:text-black transition-colors"
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

        <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>
            © 2026{" "}
            <span className="font-medium text-gray-700">
              LondonTech IT Pvt Ltd
            </span>
            . All rights reserved.
          </p>

          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-black">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-black">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
