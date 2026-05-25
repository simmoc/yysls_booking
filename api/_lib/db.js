import { neon } from '@neondatabase/serverless';

if (!process.env.YYSLS_DATABASE_URL) {
  throw new Error('YYSLS_DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.YYSLS_DATABASE_URL);

export { sql };
