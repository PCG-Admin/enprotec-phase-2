import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCreateUser } from '../server/createUserHandler'

const vercelHandler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return res.status(200).send('OK')
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { status, body } = await handleCreateUser(req.body)
  res.status(status).json(body)
}

export default vercelHandler

