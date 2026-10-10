import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { StandardFonts, rgb } from "pdf-lib";
export const ink = rgb(.08,.08,.07), paper = rgb(.982,.976,.937), bronze = rgb(.65,.50,.37), rule = rgb(.48,.48,.43);
export async function documentFonts(pdf) {
  pdf.registerFontkit(fontkit);
  const load = async (name) => pdf.embedFont(await readFile(path.join(process.cwd(), "public/fonts", name)), { subset: true });
  const [body,bold,script,serif] = await Promise.all([load("DocumentSans.ttf"),load("DocumentSans-Bold.ttf"),load("DocumentScript.ttf"),pdf.embedFont(StandardFonts.TimesRoman)]);
  return {body,bold,script,serif};
}
export function fit(font,value,width,size) { const w = font.widthOfTextAtSize(String(value),size); return w > width ? size*width/w : size; }
export function wrap(font,value,size,width) {
  const lines = [];
  for (const paragraph of String(value || "").replace(/\r/g,"").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? line+" "+word : word;
      if (font.widthOfTextAtSize(candidate,size)<=width) { line=candidate; continue; }
      if(line) lines.push(line); line="";
      for(const char of word) { if(line && font.widthOfTextAtSize(line+char,size)>width) {lines.push(line);line="";} line+=char; }
    }
    lines.push(line);
  }
  return lines;
}
