import app from '../server.ts';

// Vercel Serverless Function entry point
export default function handler(req: any, res: any) {
  return app(req, res);
}

