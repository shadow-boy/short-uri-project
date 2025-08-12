import app from './app';

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});


