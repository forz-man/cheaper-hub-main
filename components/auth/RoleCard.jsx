export default function RoleCard({ title, description, benefits, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-3xl border p-6 transition ${
        selected
          ? "border-gray-950 bg-gray-950 text-white"
          : "border-gray-200 bg-white hover:border-gray-400"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`
            h-14
            w-14
            rounded-2xl
            flex
            items-center
            justify-center
            text-2xl
            ${
              selected
                ? "bg-white text-black"
                : "bg-gray-100 text-black"
            }
          `}>
          {title === "Buyer" ? "🛒" : "🏪"}
        </div>

        <div className={`h-5 w-5 rounded-full border ${
          selected ? "border-white bg-white" : "border-gray-300"
        }`} />
      </div>

      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className={selected ? "text-gray-200" : "text-gray-500"}>
        {description}
      </p>

      <ul className="mt-5 space-y-2 text-sm">
        {benefits.map((item) => (
          <li key={item}>✓ {item}</li>
        ))}
      </ul>
    </button>
  );
}