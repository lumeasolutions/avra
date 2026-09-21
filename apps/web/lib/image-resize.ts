/**
 * Réduction / conversion d'une image par le navigateur (canvas).
 *
 * Utilisé par le stock (photo d'article, export et import Excel) : une photo
 * de téléphone (3-5 Mo, parfois en WebP / HEIC) devient un JPEG de quelques
 * dizaines de Ko, lisible partout (Excel compris) et qui tient dans une
 * requête API (limite 4 Mo côté serveur).
 *
 * Renvoie une data-URL JPEG, ou null si l'image ne peut pas être décodée
 * (ou hors navigateur).
 */
export async function resizeImageToJpeg(src: string, maxSide: number, quality = 0.85): Promise<string | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image illisible'));
      el.src = src;
    });
    const w0 = img.naturalWidth || 1;
    const h0 = img.naturalHeight || 1;
    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; // fond blanc : un PNG transparent ne vire pas au noir
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

/** Lit un fichier image et le renvoie réduit (JPEG). Repli : data-URL d'origine. */
export async function fileToResizedDataUrl(file: File, maxSide: number): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  return (await resizeImageToJpeg(original, maxSide)) ?? original;
}
