// src/Contact/ContactUsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Navibar from "@/HomePage/Navibar";

const ContactUsPage = () => {
  const wrapRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  //  CHANGE THIS to your receiving email
  const RECEIVER_EMAIL = "yourshopemail@gmail.com";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!wrapRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cu-hero",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
      );

      gsap.fromTo(
        leftRef.current,
        { x: -18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: "power2.out", delay: 0.05 }
      );

      gsap.fromTo(
        rightRef.current,
        { x: 18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: "power2.out", delay: 0.08 }
      );
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Please enter your name";
    if (!form.email.trim()) next.email = "Please enter your email";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      next.email = "Please enter a valid email";
    if (!form.subject.trim()) next.subject = "Please enter a subject";
    if (!form.message.trim()) next.message = "Please enter your message";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mailtoHref = useMemo(() => {
    const subject = form.subject
      ? `Tenzy Contact: ${form.subject}`
      : "Tenzy Contact";
    const bodyLines = [
      `Full Name: ${form.fullName}`,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : "",
      "",
      "Message:",
      form.message,
      "",
      "— Sent from Tenzy Shop Contact Page",
    ].filter(Boolean);

    const body = bodyLines.join("\n");

    return `mailto:${encodeURIComponent(RECEIVER_EMAIL)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }, [form, RECEIVER_EMAIL]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // ✅ Opens user's email app with pre-filled message
    window.location.href = mailtoHref;
  };

  const onChange = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  return (
    <div ref={wrapRef} className="w-full min-h-screen overflow-hidden">
      <Navibar />

      {/* top spacer so glass navbar is readable */}
      <div className="h-24 bg-linear-to-b from-[#0b1220] via-[#0b1220]/60 to-transparent" />

      {/* Background */}
      <div className="relative">
        <div className="absolute inset-0 bg-linear-to-b from-[#070b14] via-[#0b1220] to-[#070b14]" />
        {/* soft brand glows */}
        <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-[#ff7a18]/12 blur-3xl" />
        <div className="absolute top-40 -right-28 h-72 w-72 rounded-full bg-[#14b8a6]/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#ff7a18]/10 blur-3xl" />

        <main className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 pb-16">
          {/* Hero */}
          <section className="cu-hero">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="relative p-6 sm:p-8">
                <div className="absolute inset-0 bg-linear-to-r from-[#ff7a18]/10 via-transparent to-[#14b8a6]/10" />
                <div className="relative">
                  <p className="text-xs font-semibold tracking-wide text-white/60">
                    CONTACT US
                  </p>
                  <h1 className="mt-2 text-2xl sm:text-4xl font-semibold text-white">
                    Let’s talk — we’re here to help.
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-white/70 max-w-2xl">
                    Send us a message and we’ll get back to you. For quicker
                    help, use WhatsApp / call (optional) or visit our location
                    in Nugegoda.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Content grid */}
          <section className="mt-6 grid gap-5 lg:grid-cols-12">
            {/* Left: form */}
            <div ref={leftRef} className="lg:col-span-7">
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Send a message
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  This will open your email app with the message pre-filled.
                </p>

                <form onSubmit={onSubmit} className="mt-5 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Full Name"
                      value={form.fullName}
                      onChange={onChange("fullName")}
                      placeholder="Your name"
                      error={errors.fullName}
                    />
                    <Field
                      label="Email"
                      value={form.email}
                      onChange={onChange("email")}
                      placeholder="you@example.com"
                      error={errors.email}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Phone (optional)"
                      value={form.phone}
                      onChange={onChange("phone")}
                      placeholder="+94 ..."
                      error={errors.phone}
                    />
                    <Field
                      label="Subject"
                      value={form.subject}
                      onChange={onChange("subject")}
                      placeholder="Order / Product / Support"
                      error={errors.subject}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-white/80">
                      Message
                    </label>
                    <textarea
                      value={form.message}
                      onChange={onChange("message")}
                      rows={6}
                      placeholder="Tell us what you need..."
                      className={[
                        "mt-2 w-full rounded-2xl border bg-white/5 backdrop-blur px-4 py-3 text-sm text-white outline-none",
                        "border-white/10 focus:border-[#ff7a18]/50 focus:ring-2 focus:ring-[#14b8a6]/20",
                      ].join(" ")}
                    />
                    {errors.message ? (
                      <p className="mt-1 text-xs text-[#ff7a18]">
                        {errors.message}
                      </p>
                    ) : null}
                  </div>

                  <div className=" flex flex-row justify-center sm:grid-cols-2">
                    <button
                      type="submit"
                      className="rounded-2xl px-20 py-3 text-sm font-semibold text-white
                                 bg-linear-to-r from-[#ff7a18] to-[#f97316]
                                 shadow-lg shadow-[#ff7a18]/25
                                 hover:opacity-95 active:scale-95 transition"
                    >
                      Send Email
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: info + map */}
            <div ref={rightRef} className="lg:col-span-5 grid gap-5">
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-white">
                  Contact details
                </h3>

                <div className="mt-4 grid gap-3">
                  <InfoRow title="Email" value={RECEIVER_EMAIL} />
                  <InfoRow title="Phone" value="+94 XX XXX XXXX" />
                  <InfoRow
                    title="Hours"
                    value="Mon – Sat • 9:00 AM – 6:00 PM"
                  />
                  <InfoRow title="Location" value="Nugegoda, Sri Lanka" />
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-linear-to-r from-[#14b8a6]/10 via-transparent to-[#ff7a18]/10 p-4">
                  <p className="text-sm font-semibold text-white">Quick help</p>
                  <p className="mt-1 text-xs text-white/70">
                    For order issues, include your Order ID in the subject line.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">
                    Find us on Google Maps
                  </h3>
                  <p className="mt-1 text-sm text-white/70">Nugegoda area</p>
                </div>

                {/* Google map embed */}
                <div className="relative aspect-[16/10]">
                  <iframe
                    title="Nugegoda, Sri Lanka"
                    className="absolute inset-0 h-full w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://www.google.com/maps?q=Nugegoda%2C%20Sri%20Lanka&z=14&output=embed"
                  />
                  {/* overlay tint to reduce white */}
                  <div className="pointer-events-none absolute inset-0 bg-[#070b14]/15" />
                </div>

                <div className="p-4">
                  <a
                    className="inline-flex items-center justify-center w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white
                               bg-linear-to-r from-[#14b8a6] to-[#0ea5e9]
                               shadow-lg shadow-[#14b8a6]/20
                               hover:opacity-95 active:scale-95 transition"
                    href="https://www.google.com/maps?q=Nugegoda,+Sri+Lanka"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Footer line */}
          <div className="mt-10 text-center text-xs text-white/45">
            Tenzy Shop
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContactUsPage;

// ---- Small helper components (no extra styling beyond this page) ----
function Field({ label, value, onChange, placeholder, error }) {
  return (
    <div>
      <label className="text-sm font-semibold text-white/80">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={[
          "mt-2 w-full rounded-2xl border bg-white/5 backdrop-blur px-4 py-3 text-sm text-white outline-none",
          "border-white/10 focus:border-[#14b8a6]/50 focus:ring-2 focus:ring-[#ff7a18]/15",
        ].join(" ")}
      />
      {error ? <p className="mt-1 text-xs text-[#ff7a18]">{error}</p> : null}
    </div>
  );
}

function InfoRow({ title, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs font-semibold text-white/60">{title}</p>
      <p className="text-sm font-semibold text-white/90 text-right">{value}</p>
    </div>
  );
}
