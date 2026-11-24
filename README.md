# Document Converter

A privacy-first, browser-based document converter. Files are processed locally in the user's browser and are never sent to an application server.

## MVP features

- Batch selection and drag-and-drop upload (25 MB per file).
- Read text from PDF files with PDF.js.
- Extract text and HTML from DOCX files with Mammoth.
- Read TXT, Markdown, HTML and CSV files.
- Export to PDF, DOCX, TXT, HTML or Markdown.
- Download converted files individually or as one ZIP.
- Responsive layout, dark mode and accessible status feedback.
- GitHub Pages deployment and JavaScript syntax validation workflows.

## Run locally

Serve this directory with any static HTTP server, or open index.html in a modern browser. CDN libraries require an internet connection.

## Important limitations

- Scanned/image-only PDFs are not OCR-processed; only selectable PDF text is extracted.
- PDF export currently creates a clean text-based PDF. It does not preserve original page layout, images, tables or styling.
- DOCX export currently creates a text-based Word document and does not preserve source formatting.
- DOCX import extracts document content; advanced layout fidelity is not guaranteed.
- Legacy .doc files are not supported reliably. Convert them to .docx first.
- CSV parsing in this MVP is intentionally lightweight and does not fully implement every quoted-field edge case.
- Browser memory and device capability limit practical batch size. Files are not uploaded, but third-party CDN libraries are loaded at runtime.

## Privacy

Document contents are processed in the browser. No file-upload endpoint, account or server-side conversion service is used by this project. Avoid processing highly sensitive documents on shared or untrusted devices.

## Technology

HTML, CSS, JavaScript, PDF.js, Mammoth, jsPDF, docx.js and JSZip.
