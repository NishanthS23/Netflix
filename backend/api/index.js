import { expressServer } from '../app.js';
import { connectDB } from '../config/db.config.js';

// Connect to database using top-level await to ensure
// connection is ready before processing requests
await connectDB();

const app = expressServer();

export default app;
