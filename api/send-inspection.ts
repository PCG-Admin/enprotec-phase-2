import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleSendInspectionWebhook } from '../server/sendInspectionWebhookHandler';

const inspectionWebhookHandler = async (
  req: VercelRequest,
  res: VercelResponse
) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let requestBody = req.body;

  if (!requestBody || typeof requestBody !== 'object') {
    try {
      requestBody = JSON.parse(req.body as string);
    } catch {
      return res
        .status(400)
        .json({ error: 'Invalid JSON payload for inspection webhook.' });
    }
  }

  const { status, body } = await handleSendInspectionWebhook(requestBody);
  res.status(status).json(body);
};

export default inspectionWebhookHandler;

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
