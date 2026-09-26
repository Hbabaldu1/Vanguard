import type { IncomingMessage, ServerResponse } from 'node:http';
import { getApp } from '../server/app.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  return (app as any)(req, res);
}
