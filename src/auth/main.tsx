import * as React from 'react';
import { render } from 'react-dom';

function Component() {

  React.useEffect(() => {
    const searchParams = new URLSearchParams(document.location.search)
    const authToken = searchParams.get('token')
    if (authToken) {
      localStorage.setItem('accessToken', authToken)
    }
  })
  
  return (
    <div>
      Example tool: auth
    </div>
  )
}

render(<Component />, document.getElementById('root') as Element)