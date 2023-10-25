import { extensionPort, messages } from "@replit/extensions";

export const SECRETS = {
  TOKEN: 'SANITY_AUTH_TOKEN',
  PROJECT: 'SANITY_STUDIO_PROJECT_ID',
  DATASET: 'SANITY_STUDIO_DATASET',
};

export const createOrUpdateSecret = async ({ key, value }) => {
  const loading = await messages.showNotice(
    'Setting secret…',
    100000
  );

  const res = await extensionPort.internal.secrets.setSecret({
    key,
    value,
  });

  if (!res || !res.ok) {
    await messages.showError(
      'Could not add secret. Please try again.'
    );
    throw res.error;
  }

  await messages.hideMessage(loading);
  
  await messages.showConfirm(`Set Secret: ${key} = ${value}`);

  return;
};