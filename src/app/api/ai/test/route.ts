import { NextResponse } from 'next/server';
import { getChatCompletion, isOpenAIConfigured } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: 'OpenAI is not configured on the server' },
        { status: 503 }
      );
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await getChatCompletion([
      { role: 'user', content: prompt }
    ]);

    return NextResponse.json({ 
      success: true, 
      message: response.content 
    });
  } catch (error: any) {
    console.error('AI Test API Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during the AI request' },
      { status: 500 }
    );
  }
}
