import sanityClient, { createClient } from '@sanity/client'
import { replDb, data, exec } from '@replit/extensions';

export async function executeGroq(options: {
  projectId: string
  dataset: string
  query: string
  params: Record<string, unknown>
  useCdn: boolean
  token?: string
}) {
  const { query, params, ...clientOptions } = options
  const { token, ...noTokenClientOptions } = clientOptions
  const client = createClient({
    ...clientOptions
  })
  const noTokenClient = createClient({
    ...noTokenClientOptions
  })
  return client
    .fetch(query, params, { filterResponse: false })
    .then((response) => {
      return response.result;
    })
    .catch((err) => {
      if (err.statusCode === 401) {
        return noTokenClient.fetch(query, params, { filterResponse: false })
      }

      throw err
    })
}

export async function sanityQuery({
  endpoint
}: {
  endpoint: 'projects'
}) {
  const currentUser = await data.currentUser();
  const userId = currentUser?.user.id.toString();
  const userRecord = await replDb.get({ key: userId });

  const localToken = localStorage.getItem('accessToken');

  if (typeof userRecord !== 'string') {
    console.error(
      `Could not find user record for ${userId}.`)
    return;
  }

  const token = JSON.parse(userRecord).token;

  fetch(`https://api.sanity.io/v2021-06-07/${endpoint}`, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Authorization': `Bearer ${localToken ?? token}`,
      // 'Origin': 'null',
    },
    credentials: 'include',
  })
    .then(response => {
      console.log(response)
      return response.json()
    })
    .then(data => data)
    .catch((error) => {
      console.error('Error:', error)
      return null;
    });
}

export async function curlSanity(endpoint: string, accessToken: string) {
  return await exec.exec(`curl -s --request GET \
  --url 'https://api.sanity.io/v2021-06-07/${endpoint}' \
  -H 'Authorization: Bearer ${accessToken}'
  `).then(res => {
    if (res.exitCode !== 0) {
      throw new Error(res.output);
    }

    return JSON.parse(res.output)
  })
}