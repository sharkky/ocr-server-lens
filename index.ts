import Lens from "chrome-lens-ocr";

const lens = new Lens();

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

        const buffer = Buffer.from(await file.arrayBuffer());

        const result = await lens.scanByBuffer(buffer);

        const sortedSegments = result.segments.sort((a: any, b: any) => {
          const yDiff =
            a.boundingBox.pixelCoords.y - b.boundingBox.pixelCoords.y;

          if (Math.abs(yDiff) < 10) {
            return a.boundingBox.pixelCoords.x - b.boundingBox.pixelCoords.x;
          }

          return yDiff;
        });

        return Response.json({
          text: sortedSegments.map((s: any) => s.text).join("\n"),
          segments: sortedSegments,
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
