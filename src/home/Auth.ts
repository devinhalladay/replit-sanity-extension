// As the authentication process for the CLI relies on you interacting with the API through a browser, this can be a problem when running the CLI on a remote server. However if you follow this recipe, you will be able to successfully authenticate the remote installed CLI.

// Go to https://api.sanity.io/v1/auth/login/github?type=token&origin=http://localhost

// Exchange github for google if you prefer that. You don't need anything actually running on localhost.
// Pick out the value of the sid parameter in the return url trying to redirect to localhost.
// Load https://api.sanity.io/v1/auth/fetch?sid=xxxx using the sid value from above.
// Get the token property from the result.
// Create the file ~/.config/sanity/config.json on the remote server in the home directory for the user running the CLI.

// Set the file contents to the following, and replace "yyyy" with the token value from above:
// {
//   "authToken": "yyyy",
//   "authType": "normal"
// }

import { useEffect, useState } from 'react';

export const useSanityAuth = async () => {

  const [sanityToken, setSanityToken] = useState<string | null>(null);

  const loginWithSanity = async () => {
    // 1. Redirect user to Sanity login
    const redirectUrl = 'https://api.sanity.io/v1/auth/login/github?type=token&origin=http://localhost'
    window.location.href = redirectUrl;

    // 2. Extract 'sid' from redirected URL
    const sid = new URLSearchParams(window.location.search).get('sid');

    if(sid) { // If sid exists in the url
      // 3. Fetch token from Sanity API
      const response = await fetch(`https://api.sanity.io/v1/auth/fetch?sid=${sid}`);
      const data = await response.json();

      if (data.token) {
        setSanityToken(data.token);
      }

      // Here, you may want to add logic to save this token somewhere safe, 
      // like a server database or a cookie, if the app allows
      
      // 4. Save token to user's local server
      // if (window.require) {
      //   const fs = window.require('fs');
      //   const path = window.require('path');
      //   const os = window.require('os');
      //   const filePath = path.join(os.homedir(), '.config', 'sanity', 'config.json');
      //   const configData = {
      //     authToken: data.token,
      //     authType: 'normal'
      //   }

      console.log({
        authToken: data.token,
        authType: 'normal'
      })
        
        // fs.writeFileSync(filePath, JSON.stringify(configData));
      }
    }
  };

  useEffect(() => {
    if (!sanityToken) {
      loginWithSanity();
    }
  }, []);

  return sanityToken;
};
