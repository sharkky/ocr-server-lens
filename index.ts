type OCRBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
};
type OCRApiResponse = {
  success: boolean;
  ocr_result: string;
  ocr_boxes: OCRBox[];
};

const OCR_REPLACE_RULES: [RegExp, string][] = [
  [/K\+/g, ""],
  [/ที่เจ/g, "ทีเจ"],
];

function applyOCRReplace(text: string) {
  let result = text;
  for (const [pattern, replacement] of OCR_REPLACE_RULES) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

function groupLines(boxes: OCRBox[]) {
  const lines: OCRBox[][] = [];

  const sorted = [...boxes].sort((a, b) => a.y - b.y);

  for (const box of sorted) {
    let added = false;

    for (const line of lines) {
      const avgY = line.reduce((sum, b) => sum + b.y, 0) / line.length;
      const avgH = line.reduce((sum, b) => sum + b.h, 0) / line.length;
      const threshold = avgH * 0.6;

      if (Math.abs(box.y - avgY) < threshold) {
        line.push(box);
        added = true;
        break;
      }
    }

    if (!added) {
      lines.push([box]);
    }
  }

  lines.sort((a, b) => {
    const aY = a.reduce((sum, b) => sum + b.y, 0) / a.length;
    const bY = b.reduce((sum, b) => sum + b.y, 0) / b.length;
    return aY - bY;
  });

  return lines;
}

function mergeLine(line: OCRBox[]) {
  const sorted = [...line].sort((a, b) => a.x - b.x);
  let result = "";

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      result += sorted[i]!.text;
      continue;
    }
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const gap = curr.x - (prev.x + prev.w);

    if (gap > prev.h * 0.5) {
      result += " ";
    }
    result += curr.text;
  }

  return result;
}

Bun.serve({
  port: 5007,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/ocr" && req.method === "POST") {
      try {
        const formData = await req.formData();
        const file = formData.get("image");
        if (!(file instanceof File)) {
          return Response.json(
            { error: "No image file provided" },
            { status: 400 },
          );
        }

        const ocrForm = new FormData();
        ocrForm.append("file", file);

        const ocrRes = await fetch("http://171.100.135.254:8000/upload", {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: ocrForm,
        });

        const data = (await ocrRes.json()) as OCRApiResponse;

        if (!data.success) {
          return Response.json({ error: "OCR failed" }, { status: 500 });
        }

        const lines = groupLines(data.ocr_boxes);
        const mergedLines = lines.map(mergeLine);
        let finalText = mergedLines.join("\n");
        finalText = applyOCRReplace(finalText);

        return Response.json({ text: finalText });
      } catch (err) {
        const error = err as Error;
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log("Server running on http://localhost:5007");
