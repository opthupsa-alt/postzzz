import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update existing AI settings to use GPT-5.2 Thinking
  const result = await (prisma as any).aISettings.update({
    where: { id: 'default' },
    data: {
      modelName: 'gpt-5.2',
      maxTokens: 16000,
      reasoningEffort: 'high',
      estimatedCostPerRequest: 2.0,
    },
  });

  console.log('✅ AI Settings updated to GPT-5.2 Thinking');
  console.log('   Model:', result.modelName);
  console.log('   Max Tokens:', result.maxTokens);
  console.log('   Reasoning Effort:', result.reasoningEffort);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
