const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

exports.extractText = async (buffer, mimeType, fileName) => {
  let text = '';
  try {
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: buffer });
      text = result.value;
    } else if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
      text = buffer.toString('utf8');
    } else {
      throw new Error(`Unsupported file type: ${mimeType || fileName}`);
    }
  } catch (err) {
    throw new Error('Failed to extract text: ' + err.message);
  }
  
  if (!text || !text.trim()) {
    throw new Error("Text extraction could not extract readable text from this document. OCR support is required for scanned/image-only documents.");
  }
  return text;
};
