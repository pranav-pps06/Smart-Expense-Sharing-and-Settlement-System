/**
 * Voice Processing Service — uses Gemini to convert natural language to structured expense data.
 * The browser's Web Speech API (or Whisper in future) provides text; Gemini parses it.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db/sqlconnect');
const { promisify } = require('util');

const query = promisify(db.query).bind(db);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');

/**
 * Smart voice-to-expense: uses Gemini to parse natural language into structured expense
 */
async function parseVoiceWithAI(transcript, groupId, currentUserId) {
  const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy' && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

  // Get group members for context
  let membersContext = '';
  let membersList = [];
  if (groupId) {
    try {
      membersList = await query(`
        SELECT DISTINCT u.id, u.name, u.email
        FROM (
          SELECT g.created_by AS user_id FROM groups_made g WHERE g.id = ?
          UNION
          SELECT gm.user_id FROM group_members gm WHERE gm.group_id = ?
        ) x JOIN users u ON u.id = x.user_id
      `, [groupId, groupId]);
      membersContext = membersList.map(m => `- ${m.name} (ID: ${m.id}, email: ${m.email})`).join('\n');
    } catch (e) {
      console.error('Failed to get members for voice parse:', e);
    }
  }

  if (!hasKey) {
    // Fallback: simple regex parsing (existing logic)
    return fallbackParse(transcript, membersList, currentUserId);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const prompt = `Parse this expense description into structured data.

Input: "${transcript}"

Context:
- Current user ID: ${currentUserId}
- Group members:
${membersContext || 'No group context available'}

Extract and return ONLY a valid JSON object:
{
  "amount": <number or null>,
  "description": "<what was purchased/paid for>",
  "participantIds": [<array of member IDs who should split this>],
  "includeSelf": <true/false - whether the speaker is included in split>,
  "paidBy": <ID of who paid, default to current user ${currentUserId}>
}

Rules:
- Match participant names to the member list above (fuzzy match OK)
- If someone says "I paid" or "I spent", paidBy = ${currentUserId}
- "split with" or "between" means include those people
- "with me" means include the speaker
- If no participants mentioned, include all group members
- Amount must be a number (extract from "500", "Rs 500", "₹500", etc.)

Return ONLY JSON, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and clean
      let participantIds = Array.isArray(parsed.participantIds) ? parsed.participantIds.filter(id => Number.isInteger(id)) : [];
      
      // If includeSelf and current user not in list, add them
      if (parsed.includeSelf && currentUserId && !participantIds.includes(currentUserId)) {
        participantIds.push(currentUserId);
      }

      // If no participants found, include all members
      if (participantIds.length === 0 && membersList.length > 0) {
        participantIds = membersList.map(m => m.id);
      }

      return {
        success: true,
        total: parsed.amount || null,
        description: parsed.description || null,
        participantIds,
        paidBy: parsed.paidBy || currentUserId,
        method: 'ai',
        confidence: 'high'
      };
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('AI voice parse error:', error);
    // Fallback to regex
    return fallbackParse(transcript, membersList, currentUserId);
  }
}

/**
 * Fallback regex-based parser
 */
function fallbackParse(transcript, membersList, currentUserId) {
  const amountRegex = /(?:rs\.?\s*|₹\s*)?(\d+(?:\.\d{1,2})?)/i;
  const amountExec = amountRegex.exec(transcript);
  const total = amountExec ? parseFloat(amountExec[1]) : null;

  let description = null;
  const lowerText = transcript.toLowerCase();
  const forIdx = lowerText.indexOf('for ');
  if (forIdx >= 0) {
    description = transcript.substring(forIdx + 4).split(/ with | between | split | among /i)[0].trim();
  }

  const namesMatch = transcript.match(/(?:with|between|among|to)\s+([a-zA-Z0-9\- ,]+)/i);
  const names = namesMatch ? namesMatch[1].split(/,| and /i).map(s => s.trim()).filter(Boolean) : [];

  let participantIds = [];
  if (names.length && membersList.length) {
    participantIds = names.map(n => {
      const q = n.toLowerCase();
      const found = membersList.find(m => 
        (m.name && m.name.toLowerCase().includes(q)) || 
        (m.email && m.email.toLowerCase().includes(q))
      );
      return found ? found.id : null;
    }).filter(Boolean);
  }

  const includeSelf = /(with\s+me|between\s+me|me\s+and\s+)/i.test(lowerText);
  if (includeSelf && currentUserId && !participantIds.includes(currentUserId)) {
    participantIds.push(currentUserId);
  }

  return {
    success: total !== null,
    total,
    description,
    participantIds,
    names,
    paidBy: currentUserId,
    method: 'regex',
    confidence: 'low'
  };
}

/**
 * Process voice settlement command
 * e.g., "Mark paid me 300" or "I settled 500 with Alice"
 */
async function parseVoiceSettlement(transcript, groupId, currentUserId) {
  const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy' && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

  let membersList = [];
  if (groupId) {
    try {
      membersList = await query(`
        SELECT DISTINCT u.id, u.name, u.email
        FROM (
          SELECT g.created_by AS user_id FROM groups_made g WHERE g.id = ?
          UNION
          SELECT gm.user_id FROM group_members gm WHERE gm.group_id = ?
        ) x JOIN users u ON u.id = x.user_id
      `, [groupId, groupId]);
    } catch (e) {}
  }

  if (!hasKey) {
    return { success: false, message: 'AI not configured for settlement parsing' };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const membersContext = membersList.map(m => `- ${m.name} (ID: ${m.id})`).join('\n');

    const prompt = `Parse this settlement statement.

Input: "${transcript}"
Current user ID: ${currentUserId}
Group members:
${membersContext}

Return ONLY JSON:
{
  "from": <ID of person who paid/settled>,
  "to": <ID of person who received>,
  "amount": <number>,
  "description": "<brief description>"
}

"Mark paid me 300" means from=Mark's ID, to=${currentUserId}, amount=300
"I paid Alice 500" means from=${currentUserId}, to=Alice's ID, amount=500

Return ONLY JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, ...parsed, method: 'ai' };
    }
    return { success: false, message: 'Could not parse settlement' };
  } catch (error) {
    console.error('Settlement parse error:', error);
    return { success: false, message: 'Failed to parse settlement' };
  }
}

module.exports = {
  parseVoiceWithAI,
  parseVoiceSettlement
};
