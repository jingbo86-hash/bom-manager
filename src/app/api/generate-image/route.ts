import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { prompt, productName } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const response = await client.generate({
      prompt: prompt || `Professional product photo of "${productName || 'electronic product'}", studio lighting, white background, 8K product photography`,
      size: '2K',
    });

    const helper = client.getResponseHelper(response);

    if (helper.success) {
      return NextResponse.json({ imageUrls: helper.imageUrls });
    } else {
      return NextResponse.json({ errors: helper.errorMessages }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}