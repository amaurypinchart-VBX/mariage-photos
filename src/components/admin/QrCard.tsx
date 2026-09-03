"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCard({
  url,
  coupleNames,
}: {
  url: string;
  coupleNames: string;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 640,
      margin: 1,
      color: { dark: "#232b25", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignoré */
    }
  }

  return (
    <div className="card flex items-center gap-4 p-5">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={`QR code vers la page invités de ${coupleNames}`}
          className="h-[92px] w-[92px] flex-none rounded-[10px] bg-white p-1.5"
        />
      ) : (
        <div className="h-[92px] w-[92px] flex-none rounded-[10px]" style={{ background: "var(--surface)" }} />
      )}
      <div className="min-w-0">
        <div className="eyebrow mb-1">QR code invités</div>
        <div className="truncate text-[13px]" style={{ color: "var(--ink-soft)" }}>
          {url}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {dataUrl && (
            <a
              href={dataUrl}
              download={`qr-${coupleNames.replace(/\s+/g, "-").toLowerCase()}.png`}
              className="chip"
              style={{ cursor: "pointer" }}
            >
              ⬇ Télécharger
            </a>
          )}
          <button onClick={copy} className="chip">
            {copied ? "✓ Copié" : "🔗 Copier le lien"}
          </button>
        </div>
      </div>
    </div>
  );
}
