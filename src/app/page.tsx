'use client';

import { useState, useEffect, useRef } from 'react';
import './chat.css';
import { authService } from '../services/auth';
import { bookkeepingService } from '../services/bookkeeping';
import { reportingService } from '../services/reporting';
import { aiService } from '../services/ai';
import { mapIntent, IntentType } from '../lib/intentMapper';
import { historyManager } from '../lib/history';

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome back! I am your ISOLATERP Global AI Accountant. How can I assist you with your financial actions today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [session, setSession] = useState<{
    token: string | null;
    tenantId: string | null;
    step: 'GREETING' | 'AUTH_EMAIL' | 'AUTH_PASSWORD' | 'TENANT_SELECTION' | 'READY' | 'AUTHENTICATED';
    data: any;
  }>({
    token: null,
    tenantId: null,
    step: 'GREETING',
    data: {}
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('WebkitSpeechRecognition' in window || 'speechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const speak = (text: string) => {
    if (!speechEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const addAssistantMessage = (content: string, type: 'text' | 'report' = 'text', data?: any) => {
    setMessages(prev => [...prev, { role: 'assistant', content, type, data } as any]);
    speak(content);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      if (session.step === 'AUTH_EMAIL') {
        const tenants = await authService.getTenants(currentInput);
        if (tenants.result && tenants.result.length > 0) {
          setSession(prev => ({ ...prev, step: 'AUTH_PASSWORD', data: { ...prev.data, email: currentInput, tenants: tenants.result } }));
          addAssistantMessage('Great. Now, please enter your password to continue.');
        } else {
          addAssistantMessage('I could not find any companies associated with that email. Please try again.');
        }
      } else if (session.step === 'AUTH_PASSWORD') {
        const authData = await authService.login({
          userNameOrEmailAddress: session.data.email,
          password: currentInput,
          rememberClient: true
        });

        if (authData.result && authData.result.accessToken) {
          localStorage.setItem('token', authData.result.accessToken);
          setSession(prev => ({ ...prev, token: authData.result.accessToken, step: 'TENANT_SELECTION' }));
          const tenantList = session.data.tenants.map((t: any, i: number) => `${i + 1}. ${t.tenancyName}`).join('\n');
          addAssistantMessage(`Authentication successful! Please select a company from the list below (type the name or number):\n\n${tenantList}`);
        } else {
          addAssistantMessage('Incorrect password. Please try again.');
        }
      } else if (session.step === 'TENANT_SELECTION') {
        const selectedTenant = session.data.tenants.find((t: any, i: number) =>
          t.tenancyName.toLowerCase() === currentInput.toLowerCase() || (i + 1).toString() === currentInput
        );

        if (selectedTenant) {
          localStorage.setItem('tenantId', selectedTenant.tenantId);
          setSession(prev => ({ ...prev, tenantId: selectedTenant.tenantId, step: 'READY' }));
          addAssistantMessage(`Context set to "${selectedTenant.tenancyName}". I am ready for your commands! You can ask me to "Record a sale", "Show me a report", or "Manage banks".`);
        } else {
          addAssistantMessage('Invalid selection. Please choose from the available companies.');
        }
      } else {
        const intent = mapIntent(currentInput);
        historyManager.saveInteraction(currentInput, intent);

        if (intent.type === 'LOGIN') {
          if (intent.params.email && intent.params.password) {
            const explicitTenantId = intent.params.tenantId;

            if (explicitTenantId) {
              addAssistantMessage(`Logging you into tenant: ${explicitTenantId}...`);
              localStorage.setItem('tenantId', explicitTenantId);
            } else {
              addAssistantMessage(`No tenant provided. Attempting login to default/host account...`);
              // Clear tenantId to ensure we hit the host/default context in Abp
              localStorage.removeItem('tenantId');
            }

            const authData = await authService.login({
              userNameOrEmailAddress: intent.params.email,
              password: intent.params.password,
              tenancyName: explicitTenantId || undefined,
              rememberClient: true
            });

            if (authData.result?.accessToken) {
              localStorage.setItem('token', authData.result.accessToken);
              const activeTenant = explicitTenantId || 'Host/Default';
              setSession(prev => ({
                ...prev,
                token: authData.result.accessToken,
                step: 'READY',
                tenantId: explicitTenantId || null,
                data: { ...prev.data, email: intent.params.email, tenantId: activeTenant }
              }));
              addAssistantMessage(`Successfully authenticated! Current company context: ${activeTenant}.`);

              // Process composite report requests
              if (currentInput.toLowerCase().includes('balance sheet')) {
                addAssistantMessage('Fetching your Balance Sheet...');
                const today = new Date().toISOString();
                const report = await reportingService.getBalanceSheet(today);
                if (report.result) {
                  addAssistantMessage('Your Balance Sheet is ready!', 'report', {
                    title: 'Balance Sheet',
                    summary: 'Your statement has been generated as of today.',
                    pdfLink: report.pdfLink
                  });
                } else {
                  addAssistantMessage(`Could not generate report: ${report.error || 'No data found.'}`);
                }
              }
              return;
            } else {
              const diagError = authData.error || 'Invalid credentials.';
              addAssistantMessage(`Authentication failed for ${explicitTenantId || 'Default Tenant'}. Error: ${diagError}`);
              return;
            }
          } else {
            setSession(prev => ({ ...prev, step: 'AUTH_EMAIL' }));
            addAssistantMessage('Please provide your email address to sign in.');
          }
        } else if (intent.type === 'RECORD_SALE') {
          if (!session.token) {
            addAssistantMessage('You need to be signed in to record a sale. Would you like to log in now?');
          } else {
            if (apiKey) {
              const aiMsg = await aiService.getAccountantResponse([...messages, userMessage], apiKey);
              addAssistantMessage(aiMsg);
            } else {
              addAssistantMessage(`Recording a sale for $${intent.params.amount || '...'}. Confirming details...`);
            }
            const result = await bookkeepingService.recordSale({
              customerTitle: 'Walk-in Customer',
              invoiceInfoDetails: [
                { itemTitle: 'General Item', unitPrice: intent.params.amount || '0', quantity: '1' }
              ]
            });
            if (result.success && !apiKey) {
              addAssistantMessage(`Successfully recorded sale. Invoice No: ${result.result.invoiceNo}, Voucher: ${result.result.voucherNumber}. Would you like the PDF link?`);
            } else if (!result.success) {
              addAssistantMessage(`Failed to record sale: ${result.error || 'Unknown error'}`);
            }
          }
        } else if (intent.type === 'GET_REPORT') {
          if (!session.token) {
            addAssistantMessage('I can help with reports! Please log in first so I can access your data.');
          } else {
            if (apiKey) {
              const aiMsg = await aiService.getAccountantResponse([...messages, userMessage], apiKey);
              addAssistantMessage(aiMsg);
            } else {
              addAssistantMessage('Preparing your financial reports (Balance Sheet / P&L)... One moment.');
            }
            const result = await reportingService.getVoucherReport({ BranchTitle: 'All' });
            if (result.success && !apiKey) {
              addAssistantMessage('Your reports are ready! I found several transactions. Should I summarize the Balance Sheet for you?');
            } else if (!result.success) {
              addAssistantMessage(`Could not fetch report: ${result.error || 'Access denied'}`);
            }
          }
        } else if (intent.type === 'RECORD_PURCHASE') {
          if (!session.token) {
            addAssistantMessage('You need to be signed in to record a purchase. Would you like to log in now?');
          } else {
            if (apiKey) {
              const aiMsg = await aiService.getAccountantResponse([...messages, userMessage], apiKey);
              addAssistantMessage(aiMsg);
            } else {
              addAssistantMessage(`Recording a purchase for $${intent.params.amount || '...'}. Processing bill...`);
            }
            const result = await bookkeepingService.recordPurchase({
              vendorTitle: 'General Supplier',
              billingInfoDetails: [
                { itemTitle: 'General Expense', unitPrice: intent.params.amount || '0', quantity: '1' }
              ]
            });
            if (result.success && !apiKey) {
              addAssistantMessage(`Successfully recorded purchase. Bill No: ${result.result.billNo}, Voucher: ${result.result.voucherNumber}.`);
            } else if (!result.success) {
              addAssistantMessage(`Failed to record purchase: ${result.error || 'Unknown error'}`);
            }
          }
        } else if (intent.type === 'SWITCH_TENANT') {
          setSession(prev => ({ ...prev, step: 'TENANT_SELECTION' }));
          addAssistantMessage('Which company would you like to switch to?');
        } else {
          if (apiKey) {
            const aiMsg = await aiService.getAccountantResponse([...messages, userMessage], apiKey);
            addAssistantMessage(aiMsg);
          } else {
            addAssistantMessage("I'm not sure how to handle that request yet. I can help with bookkeeping, reports, and tenant management.");
          }
        }
      }
    } catch (error) {
      addAssistantMessage('Sorry, I encountered an error. Please try again or check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="chat-window">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">▲</span>
            <h1>ISOLATERP <span>AI Accountant</span></h1>
          </div>
          <div className="actions">
            <div className="voice-actions">
              <button
                className={`speaker-toggle ${speechEnabled ? 'active' : ''}`}
                onClick={() => setSpeechEnabled(!speechEnabled)}
                title={speechEnabled ? "Mute AI Voice" : "Enable AI Voice"}
              >
                {speechEnabled ? '🔊' : '🔈'}
              </button>
            </div>
            <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
              ⚙️
            </button>
            <div className="status">
              <span className="status-dot"></span> Online
            </div>
          </div>
        </header>

        {showSettings && (
          <div className="settings-panel">
            <h3>AI Configuration</h3>
            <input
              type="password"
              placeholder="Enter OpenAI API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="hint">Using GPT-4o-mini for professional accounting interactions.</p>
          </div>
        )}

        <div className="messages" ref={scrollRef}>
          {messages.map((msg: any, i) => (
            <div key={i} className={`message-wrapper ${msg.role}`}>
              <div className="avatar">{msg.role === 'assistant' ? 'IA' : 'U'}</div>
              <div className="message-content">
                {msg.content}

                {msg.type === 'report' && (
                  <div className="report-card">
                    <div className="report-header">
                      <span className="report-icon">📊</span>
                      <span className="report-title">{msg.data?.title || 'Financial Report'}</span>
                    </div>
                    <div className="report-summary">
                      {msg.data?.summary || 'The requested financial statement has been generated successfully.'}
                    </div>
                    <div className="report-actions">
                      <a href={msg.data?.pdfLink || '#'} target="_blank" className="btn-download">
                        📥 Download PDF
                      </a>
                      <button className="btn-view" onClick={() => alert('Detailed view coming soon!')}>
                        👁️ View HTML
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-wrapper assistant">
              <div className="avatar">IA</div>
              <div className="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>

        <div className="input-container">
          {input && historyManager.getSuggestions(input).length > 0 && (
            <div className="suggestions">
              {historyManager.getSuggestions(input).map((s, i) => (
                <button key={i} onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          )}
          <div className="input-area">
            <button
              className={`mic-btn ${isListening ? 'active' : ''}`}
              onClick={toggleListening}
              title="Speak to the Accountant"
            >
              🎤
            </button>
            <input
              type="text"
              placeholder="Type your command (e.g., 'Get balance sheet')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={loading}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
