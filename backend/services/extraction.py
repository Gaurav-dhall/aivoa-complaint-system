# backend/services/extraction.py

# pyrefly: ignore [missing-import]
from pypdf import PdfReader
import io


def extract_text_from_upload(filename: str, file_bytes: bytes) -> str:
    """
    Given an uploaded file's name and raw bytes, return plain text.
    Supports PDF, TXT, EML (treated as plain text), DOCX (basic fallback).
    """
    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text

    if lower_name.endswith(".docx"):
        # basic docx text extraction without extra heavy deps
        import zipfile
        import re as _re
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            with z.open("word/document.xml") as f:
                xml = f.read().decode("utf-8", errors="ignore")
        text = _re.sub(r"<[^>]+>", " ", xml)
        return text

    # TXT, EML, or anything else — treat as plain text
    return file_bytes.decode("utf-8", errors="ignore")