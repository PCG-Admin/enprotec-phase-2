
import { GoogleGenAI } from "@google/genai";
import { WorkflowRequest, StockItem } from '../types';

// Ensure the API key is available in the environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set for Gemini service. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateReportSummary = async (workflows: WorkflowRequest[], stock: StockItem[]): Promise<string> => {
  if (!API_KEY) {
    return "Gemini API key not configured. Cannot generate summary.";
  }

  const prompt = `
    Analyze the following industrial operations data and provide a concise summary for an operations manager.
    Focus on key metrics, potential risks (like critical stock levels), and overall workflow status.

    **Current Workflow Requests:**
    ${JSON.stringify(workflows.map(w => ({
      requestNumber: w.requestNumber,
      type: w.type,
      status: w.currentStatus,
      priority: w.priority,
      items: w.items.length
    })), null, 2)}

    **Current Stock Levels:**
    ${JSON.stringify(stock.map(s => ({
      partNumber: s.partNumber,
      description: s.description,
      onHand: s.quantityOnHand,
      minLevel: s.minStockLevel,
      isCritical: s.quantityOnHand < s.minStockLevel
    })), null, 2)}

    Generate a summary highlighting:
    1. The number of active workflows and their general status.
    2. Any critical or high-priority requests that need attention.
    3. Any stock items that are below their minimum level (critically low stock).
    4. A brief conclusion on the current operational health.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating report summary with Gemini:", error);
    return "An error occurred while generating the AI summary. Please check the console for details.";
  }
};