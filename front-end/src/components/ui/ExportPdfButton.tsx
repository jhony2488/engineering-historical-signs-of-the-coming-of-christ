"use client";

interface ExportPdfButtonProps {
  label?: string;
  className?: string;
}

export function ExportPdfButton({
  label = "Exportar PDF",
  className = "",
}: ExportPdfButtonProps) {
  async function handleExport() {
    try {
      const res = await fetch("/api/db/relatorio/pdf", { credentials: "include" });
      if (res.ok && res.headers.get("content-type")?.includes("pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "relatorio-escatologico.pdf";
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      /* fallback print */
    }
    document.body.classList.add("printing-export");
    window.print();
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("printing-export");
      },
      { once: true },
    );
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className={className || "btn-ghost"}
    >
      {label}
    </button>
  );
}
