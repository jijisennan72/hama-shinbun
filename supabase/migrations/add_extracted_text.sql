-- はま新聞PDFのテキスト抽出結果を保存するカラムを追加
ALTER TABLE pdf_documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE pdf_documents ADD COLUMN IF NOT EXISTS text_extracted_at TIMESTAMPTZ;
