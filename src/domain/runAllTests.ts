/**
 * Main Test Pipeline Entry Point
 * Executes test suites across all application features.
 */

import { runCvTailoringGuardrailTests } from './cv-tailoring/TailoringGuardrail.test';
import { runAtsScanDomainTests } from './ats-engine/AtsScanReport.test';
import { runJobPostingCacheTests } from '../application/job-posting/ParseJobPosting.test';
import { runOutreachDomainTests } from './outreach/OutreachMessage.test';
import { runOutreachApplicationTests } from '../application/outreach/GenerateOutreachMessage.test';
import { runBillingDomainTests } from './billing/TrialLifecycle.test';
import { runBillingApplicationTests } from '../application/billing/BillingLifecycle.test';
import { runJobPostingValidationTests } from './job-posting/JobPostingValidation.test';
import { runSubmitRecruiterJobPostingTests } from '../application/job-posting/SubmitRecruiterJobPosting.test';
import { runRecruiterJobPostingPipelineTests } from '../application/job-posting/RecruiterJobPostingPipeline.test';
import { runOpenRouterModelTieringTests } from '../shared/ai/adapters/OpenRouterAdapter.test';
import { runPrimaryResumeDomainTests } from './user/PrimaryResume.test';
import { runCvPaginationTests } from '../lib/cvPagination.test';
import { runEntitlementServiceTests } from '../infrastructure/billing/entitlementService.test';
import { runAiEngineApiTests } from '../infrastructure/routes/aiEngineApi.test';
import { runAdminMutationApiTests } from '../infrastructure/routes/adminMutationApi.test';
import { runFranceTravailApiTests } from '../infrastructure/routes/franceTravailApi.test';
import { runAtsAnalysisValidationTests } from '../application/ats-engine/AnalyzeAtsMatch.test';
import { runResumeAtsMetadataTests } from '../lib/resumeStore.test';
import { runLearningAiValidationTests } from '../features/learning-hub/infrastructure/LearningAIAdapter.test';
import { runCareerAiValidationTests } from '../features/career-roadmap/infrastructure/ai/CareerAIValidation.test';
import { runLearningResourcesApiTests } from '../infrastructure/routes/learningResourcesApi.test';
import { runTemplateRecommendationTests } from './resume-builder/templateRecommendation.test';
import { runResumeDataMapperTests } from '../utils/resumeDataMapper.test';
import { runInterviewQuestionsTests } from '../features/interview/infrastructure/ai/InterviewQuestions.test';
import { runResumeImportTests } from '../utils/resumeImport.test';
import { runResumeAIEngineTests } from '../features/resume-builder/infrastructure/ai/ResumeAIEngine.test';

async function main() {
  console.log('====================================================');
  console.log('Running CV Pilot Automated Test Pipeline...');
  console.log('====================================================\n');

  let totalTests = 0;

  try {
    console.log('▶ [Feature 1] CV Tailoring & Anti-Fabrication Guardrails:');
    const f1Result = runCvTailoringGuardrailTests();
    console.log(`  └─ PASSED (${f1Result.testCount} tests)\n`);
    totalTests += f1Result.testCount;

    console.log('▶ [Feature 2] ATS Scanner & Optimization Engine Domain Logic:');
    const f2Result = runAtsScanDomainTests();
    console.log(`  └─ PASSED (${f2Result.testCount} tests)\n`);
    totalTests += f2Result.testCount;

    console.log('▶ [ATS] AI response validation & no-fallback behavior:');
    const atsAnalysisResult = await runAtsAnalysisValidationTests();
    console.log(`  └─ PASSED (${atsAnalysisResult.testCount} tests)\n`);
    totalTests += atsAnalysisResult.testCount;

    console.log('▶ [ATS] Saved resume score synchronization:');
    const resumeAtsMetadataResult = runResumeAtsMetadataTests();
    console.log(`  └─ PASSED (${resumeAtsMetadataResult.testCount} tests)\n`);
    totalTests += resumeAtsMetadataResult.testCount;

    console.log('▶ [Learning Hub] Reject incomplete AI output:');
    const learningAiValidationResult = await runLearningAiValidationTests();
    console.log(`  └─ PASSED (${learningAiValidationResult.testCount} tests)\n`);
    totalTests += learningAiValidationResult.testCount;

    console.log('▶ [Career Strategy] Reject incomplete AI plans:');
    const careerAiValidationResult = runCareerAiValidationTests();
    console.log(`  └─ PASSED (${careerAiValidationResult.testCount} tests)\n`);
    totalTests += careerAiValidationResult.testCount;

    console.log('▶ [Learning Hub] Real resource result mapping:');
    const learningResourcesResult = runLearningResourcesApiTests();
    console.log(`  └─ PASSED (${learningResourcesResult.testCount} tests)\n`);
    totalTests += learningResourcesResult.testCount;

    console.log('▶ [Resume Builder] Role-aware template recommendations:');
    const templateRecommendationResult = runTemplateRecommendationTests();
    console.log(`  └─ PASSED (${templateRecommendationResult.testCount} tests)\n`);
    totalTests += templateRecommendationResult.testCount;

    console.log('▶ [Interview] Target-role and job-specific question generation:');
    const interviewQuestionsResult = runInterviewQuestionsTests();
    console.log(`  └─ PASSED (${interviewQuestionsResult.testCount} tests)\n`);
    totalTests += interviewQuestionsResult.testCount;

    console.log('▶ [Resume Builder] Imported CV data mapping:');
    const resumeDataMapperResult = runResumeDataMapperTests();
    console.log(`  └─ PASSED (${resumeDataMapperResult.testCount} tests)\n`);
    totalTests += resumeDataMapperResult.testCount;

    console.log('▶ [Resume Import] Long-document chunking and ATS aggregation:');
    const resumeImportResult = runResumeImportTests();
    console.log(`  └─ PASSED (${resumeImportResult.testCount} tests)\n`);
    totalTests += resumeImportResult.testCount;

    console.log('▶ [Resume AI] Recover omitted CV sections and reject invalid ATS scores:');
    const resumeAiEngineResult = await runResumeAIEngineTests();
    console.log(`  └─ PASSED (${resumeAiEngineResult.testCount} tests)\n`);
    totalTests += resumeAiEngineResult.testCount;

    console.log('▶ [Feature 2] Semantic Caching for Job Posting Parsing:');
    const cacheResult = await runJobPostingCacheTests();
    console.log(`  └─ PASSED (${cacheResult.testCount} tests)\n`);
    totalTests += cacheResult.testCount;

    console.log('▶ [Feature 3] Recruiter Cold Outreach Assistant Domain Logic:');
    const outreachDomainResult = runOutreachDomainTests();
    console.log(`  └─ PASSED (${outreachDomainResult.testCount} tests)\n`);
    totalTests += outreachDomainResult.testCount;

    console.log('▶ [Feature 3] Recruiter Cold Outreach Message Generation Application Use Case:');
    const outreachAppResult = await runOutreachApplicationTests();
    console.log(`  └─ PASSED (${outreachAppResult.testCount} tests)\n`);
    totalTests += outreachAppResult.testCount;

    console.log('▶ [Trial & Billing Lifecycle] Domain Logic:');
    const billingDomainResult = runBillingDomainTests();
    console.log(`  └─ PASSED (${billingDomainResult.testCount} tests)\n`);
    totalTests += billingDomainResult.testCount;

    console.log('▶ [Trial & Billing Lifecycle] Application Use Cases & Entitlement Gate:');
    const billingAppResult = await runBillingApplicationTests();
    console.log(`  └─ PASSED (${billingAppResult.testCount} tests)\n`);
    totalTests += billingAppResult.testCount;

    console.log('▶ [Role Identification & Recruiter Job Posting] Domain Validation:');
    const roleDomainResult = runJobPostingValidationTests();
    console.log(`  └─ PASSED (${roleDomainResult.testCount} tests)\n`);
    totalTests += roleDomainResult.testCount;

    console.log('▶ [Role Identification & Recruiter Job Posting] Application Use Cases:');
    const recruiterAppResult = await runSubmitRecruiterJobPostingTests();
    console.log(`  └─ PASSED (${recruiterAppResult.testCount} tests)\n`);
    totalTests += recruiterAppResult.testCount;

    console.log('▶ [Role Identification & Recruiter Job Posting] Semantic Cache Pipeline Integration:');
    const recruiterPipeResult = await runRecruiterJobPostingPipelineTests();
    console.log(`  └─ PASSED (${recruiterPipeResult.testCount} tests)\n`);
    totalTests += recruiterPipeResult.testCount;

    console.log('▶ [OpenRouter] Per-Feature Model Tiering:');
    const openRouterResult = runOpenRouterModelTieringTests();
    console.log(`  └─ PASSED (${openRouterResult.testCount} tests)\n`);
    totalTests += openRouterResult.testCount;

    console.log('▶ [Resume] Primary Resume Selection:');
    const primaryResumeResult = runPrimaryResumeDomainTests();
    console.log(`  └─ PASSED (${primaryResumeResult.testCount} tests)\n`);
    totalTests += primaryResumeResult.testCount;

    console.log('▶ [CV Export] Pagination Algorithm:');
    const cvPaginationResult = runCvPaginationTests();
    console.log(`  └─ PASSED (${cvPaginationResult.testCount} tests)\n`);
    totalTests += cvPaginationResult.testCount;

    console.log('▶ [Billing] Centralized Entitlement Service:');
    const entitlementResult = runEntitlementServiceTests();
    console.log(`  └─ PASSED (${entitlementResult.testCount} tests)\n`);
    totalTests += entitlementResult.testCount;

    console.log('▶ [AI Engine] Route Authorization & Input Validation:');
    const aiEngineResult = runAiEngineApiTests();
    console.log(`  └─ PASSED (${aiEngineResult.testCount} tests)\n`);
    totalTests += aiEngineResult.testCount;

    console.log('▶ [Admin] Mutation Route Input Validation:');
    const adminMutationResult = runAdminMutationApiTests();
    console.log(`  └─ PASSED (${adminMutationResult.testCount} tests)\n`);
    totalTests += adminMutationResult.testCount;

    console.log('▶ [France Travail] OAuth, pagination, validation & deduplication:');
    const franceTravailResult = runFranceTravailApiTests();
    console.log(`  └─ PASSED (${franceTravailResult.testCount} tests)\n`);
    totalTests += franceTravailResult.testCount;

    console.log('====================================================');
    console.log(`✅ SUCCESS: All ${totalTests} test cases PASSED successfully!`);
    console.log('====================================================');
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ TEST FAILURE: ${error.message}`);
    console.log('====================================================');
    process.exit(1);
  }
}

main();
