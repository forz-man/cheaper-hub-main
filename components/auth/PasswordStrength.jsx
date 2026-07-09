"use client";

export default function PasswordStrength({ password = "" }) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  const strength =
    score <= 2
      ? "Weak"
      : score <= 4
      ? "Medium"
      : "Strong";

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">Password Strength</span>
        <span
          className={`text-sm font-semibold ${
            strength === "Strong"
              ? "text-green-600"
              : strength === "Medium"
              ? "text-yellow-600"
              : "text-red-500"
          }`}
        >
          {strength}
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-black transition-all"
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>

      <ul className="space-y-2 text-sm">
        <li>{checks.length ? "✓" : "○"} 8 characters minimum</li>
        <li>{checks.upper ? "✓" : "○"} Uppercase letter</li>
        <li>{checks.lower ? "✓" : "○"} Lowercase letter</li>
        <li>{checks.number ? "✓" : "○"} Number</li>
        <li>{checks.special ? "✓" : "○"} Special character</li>
      </ul>
    </div>
  );
}