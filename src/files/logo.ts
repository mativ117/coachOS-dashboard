const MAX_LOGO_BYTES = 512000;
export function rasterDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
  type: "image/png" | "image/jpeg";
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length >= 33 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) &&
    String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
  )
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
      type: "image/png",
    };
  if (bytes[0] === 255 && bytes[1] === 216) {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i++] !== 255) throw new Error("Logo JPEG invalide.");
      while (bytes[i] === 255) i++;
      const marker = bytes[i++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const length = view.getUint16(i);
      if (length < 2 || i + length > bytes.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      )
        return {
          width: view.getUint16(i + 5),
          height: view.getUint16(i + 3),
          type: "image/jpeg",
        };
      i += length;
    }
  }
  throw new Error(
    "Choisissez un logo PNG ou JPEG valide ; le SVG n’est pas accepté.",
  );
}
export function validateLogo(data: unknown): asserts data is string {
  if (
    typeof data !== "string" ||
    data.length > 400000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data)
  )
    throw new Error("Logo PNG embarqué invalide.");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(data.slice(data.indexOf(",") + 1)), (c) =>
      c.charCodeAt(0),
    );
  } catch {
    throw new Error("Logo illisible.");
  }
  const dimensions = rasterDimensions(bytes);
  if (
    dimensions.type !== "image/png" ||
    !dimensions.width ||
    !dimensions.height ||
    dimensions.width > 512 ||
    dimensions.height > 512
  )
    throw new Error("Logo hors dimensions autorisées.");
  if (
    ![73, 69, 78, 68, 174, 66, 96, 130].every(
      (n, i) => bytes[bytes.length - 8 + i] === n,
    )
  )
    throw new Error("Logo PNG incomplet.");
}
export async function decodedLogo(data: string): Promise<HTMLImageElement> {
  validateLogo(data);
  const image = new Image();
  image.src = data;
  await image.decode();
  if (
    image.naturalWidth > 512 ||
    image.naturalHeight > 512 ||
    !image.naturalWidth
  )
    throw new Error("Logo illisible.");
  return image;
}
export async function readLogo(file: File): Promise<string> {
  if (file.size > MAX_LOGO_BYTES)
    throw new Error("Le logo doit faire moins de 512 Ko.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dims = rasterDimensions(bytes);
  if (!dims.width || !dims.height || dims.width > 2048 || dims.height > 2048)
    throw new Error("Le logo doit mesurer au plus 2048 × 2048 pixels.");
  const url = URL.createObjectURL(new Blob([bytes], { type: dims.type }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 256 / img.naturalWidth, 256 / img.naturalHeight);
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Images indisponibles.");
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/png");
    validateLogo(data);
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
