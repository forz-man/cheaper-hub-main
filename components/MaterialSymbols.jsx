"use client";

import { useEffect } from "react";

export default function MaterialSymbols() {
  useEffect(() => {
    const id = "material-symbols-css";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
    document.head.appendChild(link);
  }, []);

  return null;
}
