import type { UploadedFile } from "./types";

// Phone photos can be 10+ MB; the API accepts images up to 5 MB, and documents stay readable at 2000px.
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 3_000_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85));
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export async function toUploadedFile(file: File): Promise<UploadedFile> {
  const small = await shrinkImage(file);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(small);
  });
  return { name: small.name, type: small.type, dataUrl };
}
