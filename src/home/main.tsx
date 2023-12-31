import { javascript } from '@codemirror/lang-javascript';
import type { Extension } from '@codemirror/state';
import { extensionPort, messages, themes } from '@replit/extensions';
import {
  useReplit,
  useSetThemeCssVariables,
  useTheme,
} from '@replit/extensions-react';
import CodeMirror from '@uiw/react-codemirror';
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { render } from 'react-dom';
import './App.css';
import ToggleButtonGroup from './components/ButtonGroup';
import { ResultView } from './components/Result';
import { curlSanity, executeGroq } from './lib/sanity.query';
import { createThemeExtension } from './lib/theme';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import Heading from './components/Heading';
import { createOrUpdateSecret, SECRETS } from './lib/secrets';




function App() {
  const { status, error, replit } = useReplit();

  // Configuration values
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dataset, setDataset] = useState<string | null>('production');
  // UI state
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'config' | 'query'>('config');
  const [results, setResults] = useState(null);
  const [theme, setTheme] = useState<Extension | undefined>();
  const [groq, setGroq] = useState("*[_type == 'post'][0...10]{...}");

  const [projects, setProjects] = useState([]);
  const [datasets, setDatasets] = useState([]);

  useSetThemeCssVariables();

  useEffect(() => {
    const generateAndSetTheme = async () => {
      // const replitTheme = await themes.getCurrentTheme();
      const replitTheme = await replit.themes.getCurrentTheme();
      const t = createThemeExtension(replitTheme);
      setTheme(t);
    };

    generateAndSetTheme();

    themes.onThemeChange(generateAndSetTheme);
  }, []);

  const getConfigFromSecrets = async () => {
    await getSanityToken();
    await getProjectId();
    await getDataset();

    setLoading(false);
  };

  useEffect(() => {
    if (accessToken) {
      setTab('query');
    }
    
    getConfigFromSecrets();
  }, [status]);

  useEffect(() => {
    if (accessToken) {
      curlSanity(`projects`, accessToken).then((data) => {

        setProjects(data);
      });
    }
  }, [accessToken]);

  useEffect(() => {
    if (projectId && accessToken) {
      curlSanity(`projects/${projectId}/datasets`, accessToken).then((data) => {
        setDatasets(data);
        console.log('datasets', data);
      });
    }
  }, [projectId, accessToken]);

  const getSanityToken = async () => {
    const res = await replit.extensionPort.internal.secrets.getSecret({
      key: SECRETS.TOKEN,
    });

    if (res.ok && typeof res.value === 'string') {
      console.log('res ok', res)
      setAccessToken(res.value);

      return;
    } else {
      const localToken = localStorage.getItem(SECRETS.TOKEN);
      if (localToken) {
        setAccessToken(localToken);
        
        await createOrUpdateSecret({
          key: SECRETS.TOKEN,
          value: localToken,
        });
        
        localStorage.removeItem(SECRETS.TOKEN);

        return;
    }
    }

    console.warn(`No Sanity token found in process.env.${SECRETS.TOKEN}`);
    return;
  };

  const getProjectId = async () => {
    const res = await replit.extensionPort.internal.secrets.getSecret({
      key: SECRETS.PROJECT,
    });

    if (res.ok) {
      setProjectId(res.value);

      return;
    }

    // throw new Error('No SANITY_PROJECT_ID found');
    return;
  };

  const getDataset = async () => {
    const res = await replit.extensionPort.internal.secrets.getSecret({
      key: SECRETS.DATASET,
    });

    if (res.ok) {
      setDataset(res.value);

      return;
    }

    // throw new Error('No SANITY_DATASET found');
    return;
  };

  const handleRunQuery = async () => {
    const results = await executeGroq({
      projectId: projectId || '',
      dataset: dataset || '',
      query: groq,
      params: {},
      useCdn: false,
      token: accessToken || '',
    });

    setResults(results);

    return results;
  };

  const handleRunQueryExtension = keymap.of([
    {
      key: 'Mod-Enter',
      preventDefault: true,
      run: (view) => {
        const results = handleRunQuery();
        console.log(results);
        return true;
      },
    },
  ]);

  const onChange = useCallback((val, viewUpdate) => {
    setGroq(val);
  }, []);

  

  if (status === 'error' || !replit) {
    return <div className="error">{error?.message}</div>;
  }

  if (status === 'loading' || loading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="w-full flex flex-col gap-[12px] h-[100vh]">
      {accessToken ? (
      <div className="px-8 pt-8">
        <ToggleButtonGroup activeTab={tab} setTab={setTab} />
      </div>
      ) : null}

      {tab === 'query' ? (
        <section className="flex flex-col gap-8 grow">
          <section className="flex flex-col grow max-h-[50vh]">
            <div className="px-8">
              <Heading title="Run a Groq query" />
            </div>

            <div className="w-full grow h-full flex flex-col">
              <CodeMirror
                theme={theme ?? 'dark'}
                value={groq}
                height="100%"
                width="100%"
                extensions={[
                  javascript(),
                  Prec.high(handleRunQueryExtension),
                  Prec.highest(keymap.of(vscodeKeymap)),
                ]}
                onChange={onChange}
                className="border-y border-outlineDimmest overflow-hidden grow"
              />
            </div>

            <div className="p-8">
              <button
                onClick={handleRunQuery}
                className="flex flex-row items-center gap-8 w-fit"
              >
                <span>Run query</span>

                <span className="flex items-center gap-4 text-accentPrimaryStrongest">
                  <div>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M1.34835 1.34835C2.05161 0.645088 3.00544 0.25 4 0.25C4.99456 0.25 5.94839 0.645088 6.65165 1.34835C7.35491 2.05161 7.75 3.00544 7.75 4V6.25H12.25V4C12.25 3.00544 12.6451 2.05161 13.3483 1.34835C14.0516 0.645088 15.0054 0.25 16 0.25C16.9946 0.25 17.9484 0.645088 18.6517 1.34835C19.3549 2.05161 19.75 3.00544 19.75 4C19.75 4.99456 19.3549 5.94839 18.6517 6.65165C17.9484 7.35491 16.9946 7.75 16 7.75H13.75V12.25H16C16.9946 12.25 17.9484 12.6451 18.6517 13.3483C19.3549 14.0516 19.75 15.0054 19.75 16C19.75 16.9946 19.3549 17.9484 18.6517 18.6517C17.9484 19.3549 16.9946 19.75 16 19.75C15.0054 19.75 14.0516 19.3549 13.3483 18.6517C12.6451 17.9484 12.25 16.9946 12.25 16V13.75H7.75V16C7.75 16.9946 7.35491 17.9484 6.65165 18.6517C5.94839 19.3549 4.99456 19.75 4 19.75C3.00544 19.75 2.05161 19.3549 1.34835 18.6517C0.645088 17.9484 0.25 16.9946 0.25 16C0.25 15.0054 0.645088 14.0516 1.34835 13.3483C2.05161 12.6451 3.00544 12.25 4 12.25H6.25V7.75H4C3.00544 7.75 2.05161 7.35491 1.34835 6.65165C0.645088 5.94839 0.25 4.99456 0.25 4C0.25 3.00544 0.645088 2.05161 1.34835 1.34835ZM6.25 6.25V4C6.25 3.40326 6.01295 2.83097 5.59099 2.40901C5.16903 1.98705 4.59674 1.75 4 1.75C3.40326 1.75 2.83097 1.98705 2.40901 2.40901C1.98705 2.83097 1.75 3.40326 1.75 4C1.75 4.59674 1.98705 5.16903 2.40901 5.59099C2.83097 6.01295 3.40326 6.25 4 6.25H6.25ZM7.75 7.75V12.25H12.25V7.75H7.75ZM6.25 13.75H4C3.40326 13.75 2.83097 13.9871 2.40901 14.409C1.98705 14.831 1.75 15.4033 1.75 16C1.75 16.5967 1.98705 17.169 2.40901 17.591C2.83097 18.0129 3.40326 18.25 4 18.25C4.59674 18.25 5.16903 18.0129 5.59099 17.591C6.01295 17.169 6.25 16.5967 6.25 16V13.75ZM13.75 13.75V16C13.75 16.5967 13.9871 17.169 14.409 17.591C14.831 18.0129 15.4033 18.25 16 18.25C16.5967 18.25 17.169 18.0129 17.591 17.591C18.0129 17.169 18.25 16.5967 18.25 16C18.25 15.4033 18.0129 14.831 17.591 14.409C17.169 13.9871 16.5967 13.75 16 13.75H13.75ZM13.75 6.25H16C16.5967 6.25 17.169 6.01295 17.591 5.59099C18.0129 5.16903 18.25 4.59674 18.25 4C18.25 3.40326 18.0129 2.83097 17.591 2.40901C17.169 1.98705 16.5967 1.75 16 1.75C15.4033 1.75 14.831 1.98705 14.409 2.40901C13.9871 2.83097 13.75 3.40326 13.75 4V6.25Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>

                  <span className="text-xs font-medium">Enter</span>
                </span>
              </button>
            </div>
          </section>

          {results ? (
            <section className="grow shrink max-h-[50vh] flex flex-col p-8 gap-12 border-t-4 border-outlineDimmest">
              <p className="text-small font-medium text-foregroundDimmer">
                Result
              </p>
              <ResultView result={results} />
            </section>
          ) : null}
        </section>
      ) : (
        <section className="px-8 py-12 flex flex-col gap-24">
          <section className="flex flex-col gap-8">
            {accessToken ? null : (
              <Heading title={'Authenticate with Sanity'}>
                <span>
                  Logging in with Sanity sets environment variables for use by
                  both Sanity Studio and this extension's Sanity integrations.
                </span>
              </Heading>
            )}
            <div className="flex flex-col gap-8">
              {accessToken ? (
                <div className="w-full p-8 bg-backgroundHigher rounded-12 flex gap-16 text-small">
                  <div className="shrink-0 grow-0 w-32 h-32 text-accentPositiveStrongest bg-accentPositiveDimmer rounded-full flex items-center justify-center">
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

                  <div className="flex flex-col gap-2">
                    <p className="font-medium">Sanity CLI is authenticated</p>

                    <p className="text-foregroundDimmer">
                      You can now make authenticated requests through Sanity
                      Studio and this extension. Your Sanity token has been
                      saved as{' '}
                      <code className="p-4 text-[12px] rounded-4 bg-backgroundHighest text-orangeStrongest">
                        process.env['SANITY_AUTH_TOKEN']
                      </code>
                      .
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <a
                    target="_blank"
                    href={`https://api.sanity.io/v2021-06-07/auth/oauth/authorize?client_id=${
                      import.meta.env.VITE_SANITY_OAUTH_CLIENT_ID
                    }&state=true&redirect_uri=${
                      import.meta.env.VITE_REDIRECT_URI
                    }`}
                  >
                    <button className="w-fit">
                      <div className="flex items-center gap-8 w-fit">
                        <span>Login with Sanity</span>
                      </div>
                    </button>
                  </a>
                </>
              )}
            </div>
          </section>

          {accessToken ? (
            <>
              <section className="flex flex-col gap-12 pb-12">
                <Heading title="Configure your Sanity project" />

                <div className="flex flex-col gap-2">
                  <label className="text-small font-medium" htmlFor="projectId">
                    Sanity Project ID
                  </label>
                  <p className="text-small text-foregroundDimmest">Choose the project you want to use with this extension. </p>
                  {projects.length > 0 ? (
                    // Map all projects onto a select field as options. Use project.id as the value and project.displayName as the label.
                    <select
                      name="projectId"
                      id="projectId"
                      value={projectId ?? ''}
                      className='w-fit pr-64 min-w-content'
                      onChange={async (e) => {
                        setProjectId(e.target.value);

                        // await createOrUpdateSecret({
                        //   key: SECRETS.PROJECT,
                        //   value: e.target.value,
                        // });
                      }}
                      disabled={!accessToken}
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.displayName} (ID: {project.id})
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <div className='flex flex-col gap-8'>
                  <div className='flex flex-col gap-2'>
                  <p className="text-small font-medium text-foregroundDimmer" htmlFor="projectId">
                    Sanity Studio environment variable
                  </p>
                  <p className="text-small text-foregroundDimmest">Configure Sanity Studio by saving this project ID to Secrets.</p>
                    </div>
                  <button className='w-fit' onClick={async () => {
                      await createOrUpdateSecret({
                        key: SECRETS.PROJECT,
                        value: projectId,
                      });

                      return;
                          }}>
                      <div className="flex items-center gap-8 w-fit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.75C10.8462 2.75 9.75483 3.15823 8.96274 3.8623C8.17353 4.56382 7.75 5.49503 7.75 6.44444V9.25H16.25V6.44444C16.25 5.49503 15.8265 4.56382 15.0373 3.8623C14.2452 3.15823 13.1538 2.75 12 2.75ZM17.75 9.27466V6.44444C17.75 5.03638 17.12 3.70666 16.0338 2.74119C14.9505 1.77828 13.4983 1.25 12 1.25C10.5017 1.25 9.04947 1.77828 7.96619 2.74119C6.88004 3.70666 6.25 5.03638 6.25 6.44444V9.27466C5.65522 9.37184 5.17164 9.74541 4.84493 10.2036C4.46284 10.7396 4.25 11.4413 4.25 12.1818V19.8182C4.25 20.5587 4.46284 21.2604 4.84493 21.7964C5.22593 22.3307 5.8203 22.75 6.55556 22.75H17.4444C18.1797 22.75 18.7741 22.3307 19.1551 21.7964C19.5372 21.2604 19.75 20.5587 19.75 19.8182V12.1818C19.75 11.4413 19.5372 10.7396 19.1551 10.2036C18.8284 9.74541 18.3448 9.37184 17.75 9.27466ZM6.55556 10.75C6.4317 10.75 6.24829 10.8192 6.06629 11.0744C5.88538 11.3282 5.75 11.7173 5.75 12.1818V19.8182C5.75 20.2827 5.88538 20.6718 6.06629 20.9256C6.24829 21.1808 6.4317 21.25 6.55556 21.25H17.4444C17.5683 21.25 17.7517 21.1808 17.9337 20.9256C18.1146 20.6718 18.25 20.2827 18.25 19.8182V12.1818C18.25 11.7173 18.1146 11.3282 17.9337 11.0744C17.7517 10.8192 17.5683 10.75 17.4444 10.75H6.55556Z" fill="#F5F9FC" />
                        </svg>

                        <span>Save Secret <span className='mx-4 text-foregroundDimmer'>•</span> <code className='p-4 text-[12px] rounded-4 text-accentPrimaryStrongest bg-accentPrimaryDimmest'>{SECRETS.PROJECT}</code></span>
                      </div>
                    </button>
                </div>
                  
              </section>

              <section className="flex flex-col gap-12 pb-12">
                <Heading title="Choose your default dataset" />

                <div className="flex flex-col gap-2">
                  <label className="text-small font-medium" htmlFor="dataset">
                    Dataset
                  </label>
                  <p className="text-small text-foregroundDimmest">
                    Choose the dataset you want to use with this extension.
                  </p>
                  {projects.length > 0 ? (
                    // Map all projects onto a select field as options. Use project.id as the value and project.displayName as the label.
                    <select
                      name="dataset"
                      className='w-fit pr-64 min-w-content'
                      id="dataset"
                      value={dataset ?? ''}
                      onChange={async (e) => {
                        setDataset(e.target.value);

                        // await createOrUpdateSecret({
                        //   key: SECRETS.DATASET,
                        //   value: e.target.value,
                        // });
                      }}
                      disabled={!accessToken}
                    >
                      <option value="">Select a dataset</option>
                      {datasets.map((dataset) => (
                        <option key={dataset.name} value={dataset.name}>
                          {dataset.name} ({dataset.aclMode})
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                
                <div className='flex flex-col gap-8'>
                  <div className='flex flex-col gap-2'>
                  <p className="text-small font-medium text-foregroundDimmer" htmlFor="projectId">
                    Sanity Studio environment variable
                  </p>
                  <p className="text-small text-foregroundDimmest">Configure Sanity Studio by saving this dataset to Secrets.</p>
                    </div>
                  <button className='w-fit' onClick={async () => {
              await createOrUpdateSecret({
                key: SECRETS.DATASET,
                value: dataset,
              });

              return;
                  }}>
                      <div className="flex items-center gap-8 w-fit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.75C10.8462 2.75 9.75483 3.15823 8.96274 3.8623C8.17353 4.56382 7.75 5.49503 7.75 6.44444V9.25H16.25V6.44444C16.25 5.49503 15.8265 4.56382 15.0373 3.8623C14.2452 3.15823 13.1538 2.75 12 2.75ZM17.75 9.27466V6.44444C17.75 5.03638 17.12 3.70666 16.0338 2.74119C14.9505 1.77828 13.4983 1.25 12 1.25C10.5017 1.25 9.04947 1.77828 7.96619 2.74119C6.88004 3.70666 6.25 5.03638 6.25 6.44444V9.27466C5.65522 9.37184 5.17164 9.74541 4.84493 10.2036C4.46284 10.7396 4.25 11.4413 4.25 12.1818V19.8182C4.25 20.5587 4.46284 21.2604 4.84493 21.7964C5.22593 22.3307 5.8203 22.75 6.55556 22.75H17.4444C18.1797 22.75 18.7741 22.3307 19.1551 21.7964C19.5372 21.2604 19.75 20.5587 19.75 19.8182V12.1818C19.75 11.4413 19.5372 10.7396 19.1551 10.2036C18.8284 9.74541 18.3448 9.37184 17.75 9.27466ZM6.55556 10.75C6.4317 10.75 6.24829 10.8192 6.06629 11.0744C5.88538 11.3282 5.75 11.7173 5.75 12.1818V19.8182C5.75 20.2827 5.88538 20.6718 6.06629 20.9256C6.24829 21.1808 6.4317 21.25 6.55556 21.25H17.4444C17.5683 21.25 17.7517 21.1808 17.9337 20.9256C18.1146 20.6718 18.25 20.2827 18.25 19.8182V12.1818C18.25 11.7173 18.1146 11.3282 17.9337 11.0744C17.7517 10.8192 17.5683 10.75 17.4444 10.75H6.55556Z" fill="#F5F9FC" />
                        </svg>

                        <span>Save Secret <span className='mx-4 text-foregroundDimmer'>•</span> <code className='p-4 text-[12px] rounded-4 text-accentPrimaryStrongest bg-accentPrimaryDimmest'>{SECRETS.DATASET}</code></span>
                      </div>
                    </button>
                </div>
              </section>
            </>
          ) : null}
        </section>
      )}
    </main>
  );
}

export default App;

render(<App />, document.getElementById('root') as Element);
