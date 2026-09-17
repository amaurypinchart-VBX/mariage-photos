// Téléchargement d'une sélection de photos/vidéos, avec le meilleur résultat
// selon l'appareil : sur mobile, l'API Web Share permet d'enregistrer
// directement dans la galerie native (« Enregistrer l'image/la vidéo »).
// Quand ce n'est pas possible (desktop, ou navigateur non compatible), on
// assemble un ZIP unique.

export type DownloadItem = { url: string; filename: string };

async function fetchAsFile(item: DownloadItem): Promise<File> {
  const res = await fetch(item.url);
  if (!res.ok) throw new Error(`Téléchargement impossible : ${item.filename}`);
  const blob = await res.blob();
  return new File([blob], item.filename, { type: blob.type });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadSelection(
  items: DownloadItem[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (items.length === 0) return;

  const files: File[] = [];
  for (const item of items) {
    files.push(await fetchAsFile(item));
    onProgress?.(files.length, items.length);
  }

  const canShareFiles =
    typeof navigator !== "undefined" &&
    "canShare" in navigator &&
    navigator.canShare?.({ files });

  if (canShareFiles) {
    try {
      await navigator.share({ files });
      return;
    } catch (e) {
      // L'utilisateur a annulé le partage, ou le navigateur a refusé : on
      // retombe sur le ZIP plutôt que de laisser l'utilisateur sans rien.
      if (e instanceof Error && e.name === "AbortError") return;
    }
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  files.forEach((file) => zip.file(file.name, file));
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(zipBlob, "photos.zip");
}
