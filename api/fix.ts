import * as dotenv from 'dotenv';
import * as path from 'path';

// Force load .env.local because Vercel Dev sometimes misses it in function context
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, issue } = req.body;
    const ruleId = issue?.ruleId || 'unknown';

    console.log(`[API] Processing fix request for rule: ${ruleId}`);

    const apiKey = process.env['GEMINI_API_KEY'];

    // Debug: List keys to verify if .env.local is being read
    if (!apiKey) {
        console.error('CRITICAL: GEMINI_API_KEY is not defined.');
        console.error('Available Environment Variables:', Object.keys(process.env).join(', '));
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY missing' });
    }

    try {
        const prompt = `
        You are an expert in Web Accessibility (WCAG). You MUST fix the accessibility issue in the code below.
        
        Using the validation rule "${issue.ruleId}": "${issue.message}"
        SUGGESTION: "${issue.suggestion}"
        
        INPUT CODE:
        ${code}
        
        STRICT INSTRUCTIONS:
        1. Return ONLY the accessible HTML code.
        2. FIX the issue directly. Do not return the original code if it violates the rule.
        3. For 'minimize-tabindex' or positive tabindex: ALWAYS change it to tabindex="0" or remove it if not needed.
        4. No markdown, no comments, no explanations.
        `;

        // Use direct REST API to avoid ESM/CJS module issues with the SDK
        // Using 'gemini-flash-latest' which is generally the most stable free-tier friendly alias
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Extract text from Gemini response structure
        // structure: candidates[0].content.parts[0].text
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) {
            throw new Error('Empty response from Gemini');
        }

        // Clean up any markdown code blocks
        text = text.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');

        return res.status(200).json({ fixedCode: text.trim() });

    } catch (error: any) {
        console.error('Gemini API COMPLETE ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return res.status(500).json({
            error: 'Failed to generate fix',
            details: error.message || 'Unknown error'
        });
    }
}
