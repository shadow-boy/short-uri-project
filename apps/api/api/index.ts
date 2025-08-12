import serverless from 'serverless-http';
import app from '../src/app';

export const config = {
  runtime: 'nodejs20.x'
};

export default serverless(app);


