import OpenAI from 'openai';

// Ensure the OpenAI client is only initialized on the server
if (typeof window !== 'undefined') {
  // We can't throw here because this file might be imported in client components 
  // (though it shouldn't be). We just won't initialize the client.
}

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey 
  ? new OpenAI({
      apiKey,
    })
  : null;

/**
 * Utility to check if OpenAI is configured
 */
export const isOpenAIConfigured = () => {
  return !!openai;
};

/**
 * Safe wrapper for OpenAI completions
 */
export async function getChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming> = {}
) {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Default to a cost-effective model
      messages,
      ...options,
    });

    return response.choices[0].message;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}
