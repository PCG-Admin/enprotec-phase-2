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

  const { status, body } = await handleSendInspectionWebhook(req.body);
  res.status(status).json(body);
};

export default inspectionWebhookHandler;
