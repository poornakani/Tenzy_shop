import React from "react";

export default function AuthTextField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  name,
  autoComplete,
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 outline-none
                   focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
      />
    </div>
  );
}
