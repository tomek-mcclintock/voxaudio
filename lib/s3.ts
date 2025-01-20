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
  const key = `recordings/${orderId}/${uuidv4()}.webm`;
  
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: audioBlob,
      ContentType: 'audio/webm',
    })
  );

  return key;
}