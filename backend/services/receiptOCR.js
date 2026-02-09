const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');

/**
 * Extract expense data from receipt image using OCR + AI
 */
async function extractExpenseFromReceipt(imagePath) {
  try {
    // Preprocess image for better OCR
    const processedImagePath = imagePath + '_processed.png';
    await sharp(imagePath)
      .greyscale()
      .normalize()
      .sharpen()
      .toFile(processedImagePath);

    // Perform OCR
    const { data: { text } } = await Tesseract.recognize(processedImagePath, 'eng', {
      logger: m => console.log(m)
    });

    console.log('OCR Text:', text);

    // Clean up processed image
    await fs.unlink(processedImagePath).catch(() => {});

    // Use AI to extract structured data from OCR text
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy' || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      // Fallback: Simple regex extraction
      return extractExpenseDataSimple(text);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
Extract expense information from this receipt text. Return ONLY a valid JSON object with these fields:
- amount (number): Total amount in rupees
- description (string): What was purchased/paid for
- date (string): Date in YYYY-MM-DD format (use today if not found)
- merchant (string): Store/merchant name if found

Receipt Text:
${text}

Return ONLY the JSON object, nothing else.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text().trim();
    
    // Extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const expenseData = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        data: {
          amount: parseFloat(expenseData.amount) || 0,
          description: expenseData.description || 'Receipt expense',
          date: expenseData.date || new Date().toISOString().split('T')[0],
          merchant: expenseData.merchant || null,
          rawText: text.substring(0, 500) // First 500 chars for reference
        }
      };
    }

    // Fallback to simple extraction
    return extractExpenseDataSimple(text);

  } catch (error) {
    console.error('Receipt extraction error:', error);
    return {
      success: false,
      message: 'Failed to extract data from receipt',
      error: error.message
    };
  }
}

/**
 * Simple regex-based extraction (fallback when AI not available)
 */
function extractExpenseDataSimple(text) {
  // Look for amount patterns
  const amountPatterns = [
    /total[:\s]+₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /amount[:\s]+₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/,
    /rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i
  ];

  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extract first meaningful line as description
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  const description = lines[0] || 'Receipt expense';

  // Look for date
  const datePattern = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/;
  const dateMatch = text.match(datePattern);
  let date = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    try {
      const parsedDate = new Date(dateMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate.toISOString().split('T')[0];
      }
    } catch (e) {}
  }

  return {
    success: amount > 0,
    data: {
      amount,
      description: description.substring(0, 100),
      date,
      merchant: null,
      rawText: text.substring(0, 500)
    },
    message: amount > 0 ? 'Extracted using basic pattern matching' : 'Could not find amount in receipt'
  };
}

/**
 * Use Gemini Vision to analyze receipt image directly (better accuracy)
 */
async function extractExpenseFromReceiptVision(imagePath) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy' || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      // Fall back to OCR method
      return await extractExpenseFromReceipt(imagePath);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Read image as base64
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const prompt = `
Analyze this receipt image and extract the expense information.
Return ONLY a valid JSON object with these fields:
- amount (number): Total amount to be paid
- description (string): Brief description of what was purchased
- date (string): Date in YYYY-MM-DD format (use today's date if not visible)
- merchant (string): Store/restaurant name if visible
- items (array): List of item names if visible

Return ONLY the JSON object, nothing else.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const expenseData = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        data: {
          amount: parseFloat(expenseData.amount) || 0,
          description: expenseData.description || 'Receipt expense',
          date: expenseData.date || new Date().toISOString().split('T')[0],
          merchant: expenseData.merchant || null,
          items: expenseData.items || []
        },
        method: 'vision'
      };
    }

    throw new Error('Failed to parse AI response');

  } catch (error) {
    console.error('Vision extraction error:', error);
    // Fallback to OCR
    return await extractExpenseFromReceipt(imagePath);
  }
}

module.exports = {
  extractExpenseFromReceipt,
  extractExpenseFromReceiptVision
};
