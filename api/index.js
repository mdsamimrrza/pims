import app from '../Backend/src/app.js';
import { connectDatabase } from '../Backend/src/config/db.js';

let databaseConnection;

if (!databaseConnection) {
  databaseConnection = connectDatabase();
}

await databaseConnection;

export default app;
