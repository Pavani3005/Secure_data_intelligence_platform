from io import BytesIO
import fitz  # PyMuPDF
from docx import Document


def parse_input(input_type: str, content: str = None, file_bytes: bytes = None, filename: str = None) -> str:
    """
    Extract plain text from different input types.
    
    Args:
        input_type: Type of input ("text", "chat", "sql", "log", "file")
        content: Text content (for text-based inputs)
        file_bytes: File bytes (for file-based inputs)
        filename: Filename with extension (for file type detection)
    
    Returns:
        Extracted plain text string
    """
    try:
        # Handle simple text types
        if input_type in ["text", "chat", "sql"]:
            return content if content else ""
        
        # Handle log type
        if input_type == "log":
            if file_bytes:
                return file_bytes.decode('utf-8')
            return content if content else ""
        
        # Handle file type
        if input_type == "file" and filename:
            extension = filename.lower().split('.')[-1] if '.' in filename else ""
            
            # Text or log files
            if extension in ["txt", "log"]:
                if file_bytes:
                    return file_bytes.decode('utf-8')
                return content if content else ""
            
            # PDF files
            elif extension == "pdf":
                if file_bytes:
                    pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
                    text = ""
                    for page_num in range(pdf_document.page_count):
                        page = pdf_document[page_num]
                        text += page.get_text()
                    pdf_document.close()
                    return text
                return content if content else ""
            
            # Word documents
            elif extension in ["doc", "docx"]:
                if file_bytes:
                    doc = Document(BytesIO(file_bytes))
                    paragraphs = [paragraph.text for paragraph in doc.paragraphs]
                    return "\n".join(paragraphs)
                return content if content else ""
            
            # Unknown file extension
            else:
                return content if content else ""
        
        # Fallback
        return content if content else ""
    
    except Exception as e:
        # Fallback to raw content if parsing fails
        return content if content else ""
