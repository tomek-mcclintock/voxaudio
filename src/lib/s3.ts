import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.AWS_ACCESS_KEY_ID) throw new Error('Missing AWS_ACCESS_KEY_ID')
if (!process.env.AWS_SECRET_ACCESS_KEY) throw new Error('Missing AWS_SECRET_ACCESS_KEY')
if (!process.env.AWS_REGION) throw new Error('Missing AWS_REGION')
if (!process.env.AWS_BUCKET_NAME) throw new Error('Missing AWS_BUCKET_NAME')

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadVoiceRecording(audioBlob: Buffer, orderId: string) {
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const key = `recordings/${orderId}/${uuidv4()}.webm`;
  
  console.log(`[${uploadId}] Starting S3 upload for ${key}, buffer size: ${audioBlob.length} bytes`);
  
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: audioBlob,
      ContentType: 'audio/webm',
    });
    
    console.log(`[${uploadId}] Sending S3 upload command for ${key} to bucket ${process.env.AWS_BUCKET_NAME}`);
    const result = await s3.send(command);
    console.log(`[${uploadId}] S3 upload successful for ${key}, result:`, result);
    
    return key;
  } catch (error) {
    console.error(`[${uploadId}] S3 upload failed for ${key}:`, error);
    if (error instanceof Error) {
      console.error(`[${uploadId}] Error name: ${error.name}, message: ${error.message}`);
      console.error(`[${uploadId}] Error stack:`, error.stack);
    }
    throw error; // Re-throw to be handled by the caller
  }
}