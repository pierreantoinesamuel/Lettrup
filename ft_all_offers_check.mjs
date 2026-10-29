import dotenv from 'dotenv';
import { handleFranceTravailSearchRoute } from './src/infrastructure/routes/franceTravailApi.ts';

dotenv.config({ path: '.env.local' });

const result = await handleFranceTravailSearchRoute({});
console.log(JSON.stringify({
  success: result.success,
  totalReportedByFranceTravail: result.total,
  offersReturnedByRoute: result.jobs?.length,
  errorCode: result.code,
}));
