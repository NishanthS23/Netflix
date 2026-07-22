import { expressServer } from '../backend/app.js';
import { connectDB } from '../backend/config/db.config.js';

// Connect to MongoDB using top-level await to ensure
// connection is ready before processing requests
await connectDB();

const app = expressServer();

export default app;
