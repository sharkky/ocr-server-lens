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

        const ocrRes = await fetch("http://YOUR-IP:8000/upload", {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: ocrForm,
        });

        const data = await ocrRes.json();

        if (!data.success) {
          return Response.json({ error: "OCR failed" }, { status: 500 });
        }

        return Response.json({
          text: data.ocr_result,
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
