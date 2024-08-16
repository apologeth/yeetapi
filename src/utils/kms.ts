import ENVIRONMENT from '../config/environment';
import aws, { Credentials } from 'aws-sdk';

aws.config.update({
  credentials: new Credentials({
    accessKeyId: ENVIRONMENT.AWS_ACCESS_KEY_ID!,
    secretAccessKey: ENVIRONMENT.AWS_SECRET_ACCESS_KEY!,
  }),
  region: ENVIRONMENT.AWS_REGION!,
});

const kms = new aws.KMS();
export async function encryptToKMS(shardKMS: string) {
  const params = {
    KeyId: ENVIRONMENT.AWS_KMS_KEY_ID!, // Replace with your KMS key ID or alias
    Plaintext: Buffer.from(shardKMS),
    EncryptionContext: {
      Description: 'Shard',
    },
  };

  const data = await kms.encrypt(params).promise();
  const encryptedShard = data.CiphertextBlob?.toString('base64');
  console.log(encryptedShard);
  return encryptedShard;
}

export async function decryptFromKMS(encryptedShard: string) {
  const params = {
    CiphertextBlob: Buffer.from(encryptedShard, 'base64'),
    EncryptionContext: {
      Description: 'Shard',
    },
  };

  const data = await kms.decrypt(params).promise();
  const shardKMS = data.Plaintext?.toString('utf-8');
  return shardKMS;
}
