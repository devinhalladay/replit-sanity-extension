import { javascript } from '@codemirror/lang-javascript';
import type { Extension } from '@codemirror/state';
import { themes } from '@replit/extensions';
import {
  useReplit,
  useSetThemeCssVariables,
  useTheme,
} from '@replit/extensions-react';
import CodeMirror from '@uiw/react-codemirror';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

export const createOrUpdateSecret = async (replit, { key, value }) => {
  if (replit) {
    const loading = await replit.messages.showNotice(
      'Adding secret…',
      100000
    );

    const res = await replit.extensionPort.internal.secrets.setSecret({
      key,
      value,
    });

    if (!res || !res.ok) {
      await replit.messages.showError(
        'Could not add secret. Please try again.'
      );
      throw res.error;
    }

    await replit.messages.showConfirm(`Secret added: ${key}`);

    await replit.messages.hideMessage(loading);
  }
};

export const SECRETS = {
  TOKEN: 'SANITY_PERSONAL_TOKEN',
  PROJECT: 'SANITY_PROJECT_ID',
  DATASET: 'SANITY_DATASET',
};

function App() {
  const { status, error, replit } = useReplit();
  // const replitTheme = useTheme();

  // Configuration values
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dataset, setDataset] = useState<string | null>('production');
  // UI state
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'config' | 'query'>('config');
  const [results, setResults] = useState(null);
  const [theme, setTheme] = useState<Extension | undefined>();
  const [groq, setGroq] = useState("*[_type == 'post'][0...1]{...}");
  // Configuration input references
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const datasetInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState([]);
  const [datasets, setDatasets] = useState([]);

  useSetThemeCssVariables();

  useEffect(() => {
    const generateAndSetTheme = async () => {
      const replitTheme = await themes.getCurrentTheme();
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

    if (accessToken) {
      setTab('query');
    }

    setLoading(false);
  };

  useEffect(() => {
    getConfigFromSecrets();
  }, [status]);

  useEffect(() => {
    if (accessToken) {
      curlSanity(`projects`, accessToken).then((data) => {
        console.log('orojectes', data);
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
        await createOrUpdateSecret(replit, {
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

    throw new Error('No SANITY_PROJECT_ID found');
  };

  const getDataset = async () => {
    const res = await replit.extensionPort.internal.secrets.getSecret({
      key: SECRETS.DATASET,
    });

    if (res.ok) {
      setDataset(res.value);

      return;
    }

    throw new Error('No SANITY_DATASET found');
  };


  

  const saveProjectId = async () => {
    const _projectId = projectInputRef.current?.value;

    if (_projectId) {
      await createOrUpdateSecret(replit, {
        key: 'SANITY_PROJECT_ID',
        value: _projectId,
      });

      setProjectId(_projectId);
    }
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
      <div className="px-8 pt-8">
        <ToggleButtonGroup activeTab={tab} setTab={setTab} />
      </div>

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
                    <p className="font-medium">Sanity is authenticated</p>

                    <p className="text-foregroundDimmer">
                      You can now make authenticated requests through Sanity
                      Studio and this extension. Your Sanity token has been
                      saved as{' '}
                      <code className="p-4 text-[12px] rounded-8 bg-backgroundHighest text-orangeStrongest">
                        process.env['SANITY_PERSONAL_TOKEN']
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
                <Heading title="Configure your Sanity project">
                  Changing this will update{' '}
                  <code className="p-4 text-[12px] rounded-8 bg-backgroundHigher text-orangeStrongest">
                    process.env['SANITY_PROJECT_ID']
                  </code>{' '}
                  which is used by both Sanity Studio and this extension.
                </Heading>

                <div className="flex flex-col gap-2">
                  <label className="text-small font-medium" htmlFor="projectId">
                    Sanity Project ID
                  </label>
                  {projects.length > 0 ? (
                    // Map all projects onto a select field as options. Use project.id as the value and project.displayName as the label.
                    <select
                      name="projectId"
                      id="projectId"
                      value={projectId ?? ''}
                      onChange={async (e) => {
                        setProjectId(e.target.value);

                        await createOrUpdateSecret(replit, {
                          key: 'SANITY_PROJECT_ID',
                          value: e.target.value,
                        });
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
              </section>

              <section className="flex flex-col gap-12 pb-12">
                <Heading title="Choose your default dataset">
                  Both Sanity and the Groq Playground will use this dataset for
                  queries via{' '}
                  <code className="p-4 text-[12px] rounded-8 bg-backgroundHigher text-orangeStrongest">
                    process.env['SANITY_DATASET']
                  </code>
                </Heading>

                <div className="flex flex-col gap-2">
                  <label className="text-small font-medium" htmlFor="dataset">
                    Dataset
                  </label>
                  {projects.length > 0 ? (
                    // Map all projects onto a select field as options. Use project.id as the value and project.displayName as the label.
                    <select
                      name="dataset"
                      id="dataset"
                      value={dataset ?? ''}
                      onChange={async (e) => {
                        setProjectId(e.target.value);

                        await createOrUpdateSecret(replit, {
                          key: 'SANITY_DATASET',
                          value: e.target.value,
                        });
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
