export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center lg:text-left">
        <h2 className="text-3xl font-bold text-gray-950">{title}</h2>
        {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}