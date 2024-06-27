import { dockerCreateNetwork, dockerRun, dockerStop, dockerRm } from './index';

interface Options {
  mailClientPort?: number;
  smtpPort?: number;
}

export async function smtpStart(opts?: Options) {
  try {
    await smtpStop();
  } catch (e: any) {
    if (!e.message.includes('No such container')) {
      throw e;
    }
  }
  const smtpPort = opts?.smtpPort ?? 25;
  const mailClientPort = opts?.mailClientPort ?? 5002;
  const mailClientPortMapping = `${mailClientPort}:80`;
  const smtpPortMapping = `${smtpPort}:25`;
  await dockerCreateNetwork({ networkName: 'langit' });
  const containerId = await dockerRun({
    image: 'rnwood/smtp4dev:v3.1',
    containerName: 'langit-smtp',
    dockerParams: [
      '-p',
      mailClientPortMapping,
      '-p',
      smtpPortMapping,
      '--network=langit',
    ],
  });

  console.log(
    `Started smtp4dev with id ${containerId} mapped to host port ${mailClientPort}.`,
  );
  return containerId;
}

export async function smtpStop() {
  await dockerStop({ containerId: 'langit-smtp' });
  await dockerRm({ containerId: 'langit-smtp' });
}
