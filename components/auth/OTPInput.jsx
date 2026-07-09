"use client";

import { useRef } from "react";

export default function OTPInput({
  value,
  onChange,
}) {
  const refs = useRef([]);

  const handleChange = (index, val) => {
    if (!/^\d?$/.test(val)) return;

    const newValue = [...value];
    newValue[index] = val;

    onChange(newValue);

    if (val && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (refs.current[index] = el)}
          value={digit}
          maxLength={1}
          onChange={(e) =>
            handleChange(index, e.target.value)
          }
          className="h-14 w-14 rounded-xl border border-gray-200 text-center text-xl font-bold outline-none focus:border-black"
        />
      ))}
    </div>
  );
}