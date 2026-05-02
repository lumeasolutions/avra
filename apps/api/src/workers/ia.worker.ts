import Queue from 'bull';
import OpenAI from 'openai';

const iaJobsQueue = new Queue('ia-jobs', {
  redis: { host: 'localhost', port: 6379 },
});

// Process IA jobs
iaJobsQueue.process(async (job) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const result = await openai.images.generate({
      model: 'dall-e-3',
      prompt: job.data.prompt,
      size: '1024x1024',
    });
    return result;
  } catch (error) {
    throw error;
  }
});

export default iaJobsQueue;
