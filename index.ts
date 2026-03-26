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

        const sortedSegments = data.ocr_boxes.sort((a: any, b: any) => {
          const yDiff = a.y - b.y;

          if (Math.abs(yDiff) < 10) {
            return a.x - b.x;
          }

          return yDiff;
        });

        return Response.json({
          text: sortedSegments
            .map((s) => s.text)
            .join("\n")
            .replace(/\nK\+/g, ""),
        });
      } catch (err) {
        const error = err as Error;

        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log("Server running on http://localhost:5007");
