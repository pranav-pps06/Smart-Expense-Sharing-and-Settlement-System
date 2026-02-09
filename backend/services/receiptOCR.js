const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const crypto = require('crypto');
const ReceiptCache = require('../mongo/ReceiptCache');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');

/**
 * Compute MD5 hash of image file for caching
 */
async function computeImageHash(imagePath) {
  const buffer = await fs.readFile(imagePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Check cache for previously scanned receipt
 */
async function getCachedReceipt(imageHash) {
  try {
    const cached = await ReceiptCache.findOne({ image_hash: imageHash });
    if (cached) {
      // Increment hit count
      await ReceiptCache.updateOne(
        { image_hash: imageHash },
        { $inc: { hit_count: 1 } }
      );
      return cached.data;
    }
    return null;
  } catch (e) {
    console.error('Cache lookup error:', e);
    return null;
  }
}

/**
 * Store scanned receipt in cache
 */
async function cacheReceipt(imageHash, data, userId) {
  try {
    await ReceiptCache.create({
      image_hash: imageHash,
      data,
      user_id: userId
    });
  } catch (e) {
    // Ignore duplicate key errors
    if (e.code !== 11000) {
      console.error('Cache store error:', e);
    }
  }
}

/**
 * Extract expense data from receipt image using OCR + AI
 */
async function extractExpenseFromReceipt(imagePath, userId = null) {
  try {
    // Check cache first
    const imageHash = await computeImageHash(imagePath);
    const cached = await getCachedReceipt(imageHash);
    if (cached) {
      console.log('Receipt cache hit:', imageHash);
      return {
        success: true,
        data: cached,
        cached: true
      };
    }

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

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
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
      const resultData = {
        amount: parseFloat(expenseData.amount) || 0,
        description: expenseData.description || 'Receipt expense',
        date: expenseData.date || new Date().toISOString().split('T')[0],
        merchant: expenseData.merchant || null,
        rawText: text.substring(0, 500) // First 500 chars for reference
      };
      
      // Cache the result
      await cacheReceipt(imageHash, resultData, userId);
      
      return {
        success: true,
        data: resultData
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
async function extractExpenseFromReceiptVision(imagePath, userId = null) {
  try {
    // Check cache first
    const imageHash = await computeImageHash(imagePath);
    const cached = await getCachedReceipt(imageHash);
    if (cached) {
      console.log('Receipt cache hit (vision):', imageHash);
      return {
        success: true,
        data: cached,
        cached: true,
        method: 'cache'
      };
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy' || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      // Fall back to OCR method
      return await extractExpenseFromReceipt(imagePath, userId);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

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
      const resultData = {
        amount: parseFloat(expenseData.amount) || 0,
        description: expenseData.description || 'Receipt expense',
        date: expenseData.date || new Date().toISOString().split('T')[0],
        merchant: expenseData.merchant || null,
        items: expenseData.items || []
      };
      
      // Cache the result
      await cacheReceipt(imageHash, resultData, userId);
      
      return {
        success: true,
        data: resultData,
        method: 'vision'
      };
    }

    throw new Error('Failed to parse AI response');

  } catch (error) {
    console.error('Vision extraction error:', error);
    // Fallback to OCR
    return await extractExpenseFromReceipt(imagePath, userId);
  }
}

module.exports = {
  extractExpenseFromReceipt,
  extractExpenseFromReceiptVision
};
