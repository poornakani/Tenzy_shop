import logo from "../public/images/logo.png";
import search from "../public/images/search.png";
import heart from "../public/images/heart.png";
import man from "../public/images/man.png";
import cart from "../public/images/trolley.png";
import header1 from "../public/images/header_img.png";
import header2 from "../public/images/header2.jpg";
import header3 from "../public/images/header3.jpg";
import header4 from "../public/images/header4.jpg";
import banner01 from "../public/images/header4.jpg";

import placeholder from "../public/images/sellingProd/placeholder.svg";
import check from "../public/images/check.png";

export const assets = {
  logo,
  search,
  heart,
  man,
  cart,
  header1,
  header2,
  header3,
  header4,
  banner01,
  check,
};

export const sellingpro = {
  aveeno:    placeholder,
  cereve:    placeholder,
  lorial:    placeholder,
  madagskar: placeholder,
  ordinary:  placeholder,
  vitac:     placeholder,
};

export const slides = [
  {
    image: assets.header1,
    title: "Tenzy Fashion UK",
    description: "Luxury skincare crafted for elegance",
  },
  {
    image: assets.header2,
    title: "Pure Radiance",
    description: "Glow naturally with premium ingredients",
  },
  {
    image: assets.header3,
    title: "Skin Revival",
    description: "Nourish • Repair • Restore",
  },
  {
    image: assets.header4,
    title: "Daily Essentials",
    description: "Minimal routine, maximum results",
  },
];


export const Testimonials = [
  {
    name: "Sarah M.",
    role: "Verified customer",
    quote: "Fast delivery and authentic products. My skin feels amazing!",
    rating: 5,
  },
  {
    name: "Amal K.",
    role: "Verified customer",
    quote: "Beautiful packaging and great quality. Will order again.",
    rating: 5,
  },
  {
    name: "Nimal P.",
    role: "Verified customer",
    quote: "Support team helped me choose the right routine. So helpful!",
    rating: 4,
  },
  {
    name: "Emma R.",
    role: "Verified customer",
    quote: "The Ordinary + CeraVe combo changed my skincare game.",
    rating: 5,
  },
  {
    name: "Leena S.",
    role: "Verified customer",
    quote: "Everything arrived perfectly. Great experience overall.",
    rating: 5,
  },
  {
    name: "Hasan A.",
    role: "Verified customer",
    quote: "Prices are fair and products are original. Love it.",
    rating: 5,
  },
  {
    name: "Maya D.",
    role: "Verified customer",
    quote: "Simple checkout and quick dispatch. Highly recommended.",
    rating: 4,
  },
  {
    name: "Jason T.",
    role: "Verified customer",
    quote: "Excellent range of brands and the site looks premium.",
    rating: 5,
  },
  {
    name: "Isuri W.",
    role: "Verified customer",
    quote: "Good customer service and quick replies on messages.",
    rating: 5,
  },
  {
    name: "Daniel K.",
    role: "Verified customer",
    quote: "The best skincare store I found recently. Trusted.",
    rating: 5,
  },
  {
    name: "Riya P.",
    role: "Verified customer",
    quote: "Love the brand selection and quick delivery.",
    rating: 5,
  },
  {
    name: "Noah S.",
    role: "Verified customer",
    quote: "Smooth experience, genuine items, great support.",
    rating: 5,
  },
];

export const linkSections = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", url: "/home" },
      { label: "Best Sellers", url: "/products" },
      { label: "New Arrivals", url: "/products" },
      { label: "Contact Us", url: "/contact" },
      { label: "FAQs", url: "/help" },
    ],
  },
  {
    title: "Need Help?",
    links: [
      { label: "Delivery Information", url: "/help" },
      { label: "Return & Refund Policy", url: "/help" },
      { label: "Payment Methods", url: "/help" },
      { label: "Track your Order", url: "/help" },
      { label: "Contact Us", url: "/contact" },
    ],
  },
  {
    title: "Follow Us",
    links: [
      { label: "Instagram", url: "https://instagram.com" },
      { label: "Tik Tok", url: "https://tiktok.com" },
      { label: "Facebook", url: "https://facebook.com" },
      { label: "YouTube", url: "https://youtube.com" },
    ],
  },
];

export const faqs = [
  {
    question: "How do I place an order?",
    answer:
      "Browse our product catalog, add items to your cart, and proceed to checkout. You can pay using CocoPay with convenient instalment options.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept payments through CocoPay, which supports 3–4 instalment plans. Additional payment options will be added soon.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Standard delivery takes 2–5 business days. Orders above LKR 50,000 qualify for free shipping. Express delivery options are available at checkout.",
  },
  {
    question: "Can I return a product?",
    answer:
      "Yes, we offer a 14-day return policy on unopened, unused products in their original packaging. Please visit our Help page or contact us to initiate a return.",
  },
  {
    question: "Are your products authentic?",
    answer:
      "Absolutely. We source all products directly from authorised distributors and brand partners. Every item sold on Tenzy Shop is 100% genuine.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Once your order is dispatched, you will receive a tracking link via email or SMS. You can also check your order status from your account dashboard.",
  },
];
