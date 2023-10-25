import * as React from 'react';
import { render } from 'react-dom';
import { SECRETS } from '../home/lib/secrets';
import './main.css'

function Component() {
  const searchParams = new URLSearchParams(document.location.search)
  const authToken = searchParams.get('token')
  const status = searchParams.get('status')

  React.useEffect(() => {
    if (authToken) {
      localStorage.setItem(SECRETS.TOKEN, authToken)
    }
  })

  if (status === 'success') {
    return (
      <div className="flex flex-col gap-12 center items-center justify-center">
        <div className="shrink-0 grow-0 w-32 h-32 text-[#b8e9b8] bg-[#295f20] rounded-full flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M20.5303 5.46967C20.8232 5.76256 20.8232 6.23744 20.5303 6.53033L9.53033 17.5303C9.23744 17.8232 8.76256 17.8232 8.46967 17.5303L3.46967 12.5303C3.17678 12.2374 3.17678 11.7626 3.46967 11.4697C3.76256 11.1768 4.23744 11.1768 4.53033 11.4697L9 15.9393L19.4697 5.46967C19.7626 5.17678 20.2374 5.17678 20.5303 5.46967Z"
              fill="currentColor"
            />
          </svg>
        </div>
        
        <h1 className="text-subheadBig font-medium">Successfully logged in with Sanity</h1>
        <p>Close this window and refresh the Sanity extension to continue.</p>
      </div>
      )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-12 center items-center justify-center">
        <h1 className="text-subheadBig font-600">Error authenticating with Sanity</h1>
        <p>There was an error logging in. Please try again later.</p>
      </div>
      )
  }


  return null
}

render(<Component />, document.getElementById('root') as Element)