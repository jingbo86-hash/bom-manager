import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的图片' }, { status: 400 });
    }

    // 校验文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG/PNG/GIF/WebP/SVG 格式图片' }, { status: 400 });
    }

    // 校验文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: '图片大小不能超过 5MB' }, { status: 400 });
    }

    // 初始化对象存储
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 生成文件名：products/时间戳_原始文件名
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `products/${Date.now()}_${safeName}`;

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type,
    });

    // 生成签名 URL（7天有效期）
    const imageUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 604800,
    });

    return NextResponse.json({ imageUrl, fileKey });
  } catch (error) {
    console.error('上传图片失败:', error);
    return NextResponse.json({ error: '上传图片失败，请重试' }, { status: 500 });
  }
}