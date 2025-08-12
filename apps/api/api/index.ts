import serverless from 'serverless-http';
import app from '../src/app';

// Use default Node.js runtime. Do not specify unsupported versions.
export const config = { runtime: 'nodejs' };

export default serverless(app);


