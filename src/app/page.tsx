'use client';

import React, { useState, useEffect, useRef } from 'react';
import './chat.css';
import { api } from '../lib/api'; // Ensure api import is available
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
  const [showReportModal, setShowReportModal] = useState<any>(null);
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

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech Recognition Error:', event.error);
        setIsListening(false);
        addAssistantMessage(`Microphone error: ${event.error}. Please ensure mic access is allowed in your browser.`);
      };
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

  const fetchRealReportData = async () => {
    try {
      const [invoices, bills, banks] = await Promise.all([
        reportingService.getInvoices(),
        reportingService.getBills(),
        reportingService.getBanks()
      ]);

      const totalSales = (invoices?.result?.result || []).reduce((sum: number, inv: any) => sum + (inv.netValue || 0), 0);
      const totalPurchases = (bills?.result?.result || []).reduce((sum: number, bill: any) => sum + (bill.netValue || 0), 0);
      const bankList = banks?.result?.result || banks?.result || [];
      const totalBank = bankList.reduce((sum: number, b: any) => sum + (b.balance || 0), 0);

      const netEarnings = totalSales - totalPurchases;

      return [
        {
          category: 'Assets',
          items: [
            { name: 'Cash and Bank Balance', amount: totalBank.toLocaleString() },
            { name: 'Accounts Receivable (Sales)', amount: totalSales.toLocaleString() }
          ],
          total: (totalBank + totalSales).toLocaleString()
        },
        {
          category: 'Liabilities',
          items: [
            { name: 'Accounts Payable (Purchases)', amount: totalPurchases.toLocaleString() }
          ],
          total: totalPurchases.toLocaleString()
        },
        {
          category: 'Equity',
          items: [
            { name: 'Current Period Retained Earnings', amount: netEarnings.toLocaleString() }
          ],
          total: netEarnings.toLocaleString()
        }
      ];
    } catch (error) {
      console.error('Error fetching real report data:', error);
      return [
        { category: 'Error', items: [{ name: 'Failed to fetch live data', amount: '0' }], total: '0' }
      ];
    }
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
            const activeTenant = explicitTenantId || 'Host/Default';

            if (explicitTenantId) {
              addAssistantMessage(`Logging you into tenant: ${explicitTenantId}...`);
              localStorage.setItem('tenantId', explicitTenantId);
            } else {
              addAssistantMessage(`No tenant provided. Attempting login to default/host account...`);
              localStorage.removeItem('tenantId');
            }

            const authData = await authService.login({
              userNameOrEmailAddress: intent.params.email,
              password: intent.params.password,
              tenancyName: explicitTenantId || undefined,
              rememberClient: true
            });

            if (authData.result && authData.result.accessToken) {
              const token = authData.result.accessToken;
              localStorage.setItem('token', token);

              let finalTenantId = explicitTenantId;
              let finalTenantName = activeTenant;

              // Auto-Resolve Tenant if not provided
              if (!explicitTenantId) {
                addAssistantMessage('Checking for associated companies...');
                const tenantRes = await authService.getTenants(intent.params.email);
                const tenants = tenantRes.result || [];
                if (tenants.length > 0) {
                  // Auto-select first tenant
                  finalTenantId = tenants[0].tenantId;
                  finalTenantName = tenants[0].tenancyName;
                  localStorage.setItem('tenantId', finalTenantId.toString());
                  addAssistantMessage(`Automatically logged into default company: **${finalTenantName}** (PIN: ${finalTenantId}).`);
                } else {
                  addAssistantMessage('No companies found for this account. You are logged in as Host.');
                }
              } else {
                localStorage.setItem('tenantId', explicitTenantId);
              }

              setSession(prev => ({
                ...prev,
                token: token,
                step: 'READY',
                tenantId: finalTenantId,
                data: { ...prev.data, email: intent.params.email, tenantId: finalTenantName, tenants: [] } // Clear tenants list 
              }));

              if (explicitTenantId) {
                addAssistantMessage(`Successfully authenticated! Current company context: ${finalTenantName}.`);
              }

              // Process composite report requests
              const lowerInput = currentInput.toLowerCase();
              if (lowerInput.includes('balance sheet') || lowerInput.includes('report') || lowerInput.includes('pnl') || lowerInput.includes('profit')) {
                addAssistantMessage('Fetching your financial data for the report...');
                const realData = await fetchRealReportData();

                let pdfReport;
                let reportTitle = 'Financial Report';

                if (lowerInput.includes('profit') || lowerInput.includes('pnl') || lowerInput.includes('loss')) {
                  // Default to last 6 months if not specified
                  const toDate = new Date();
                  const fromDate = new Date();
                  fromDate.setMonth(toDate.getMonth() - 6);
                  pdfReport = await reportingService.getPNL(fromDate.toISOString(), toDate.toISOString());
                  reportTitle = 'Profit & Loss (Last 6 Months)';
                } else {
                  const today = new Date().toISOString();
                  pdfReport = await reportingService.getBalanceSheet(today);
                  reportTitle = 'Balance Sheet';
                }

                // Check nesting: API returns { result: { pdfLink: "..." } } usually
                const actualPdfStruct = pdfReport?.result || pdfReport;
                const link = actualPdfStruct?.pdfLink;

                const pdfUrl = link
                  ? (link.startsWith('http')
                    ? link
                    : `https://api.isolaterp.ai${link.startsWith('/') ? '' : '/'}${link}`)
                  : '#';

                addAssistantMessage(`Your ${reportTitle} is ready!`, 'report', {
                  title: reportTitle,
                  summary: 'Your statement has been generated with live data from your ERP.',
                  pdfLink: pdfUrl,
                  htmlData: realData
                });
              }
              return;
            } else {
              const pwHint = intent.params.password
                ? `${intent.params.password[0]}***${intent.params.password.slice(-1)}`
                : 'none';
              const diagError = authData.error || 'Invalid credentials.';
              addAssistantMessage(`Authentication failed for ${explicitTenantId || 'Default Tenant'}. (Extracted Email: ${intent.params.email}, PW: ${pwHint}). Error: ${diagError}`);
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
              addAssistantMessage('Fetching live data for your report...');
              const realData = await fetchRealReportData();

              let pdfRes;
              let reportTitle = 'Financial Report';

              if (intent.params.isPnl || (intent.params.dateRange && intent.params.dateRange.from)) {
                const fromDate = intent.params.dateRange?.from || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString();
                const toDate = intent.params.dateRange?.to || new Date().toISOString();
                pdfRes = await reportingService.getPNL(fromDate, toDate);
                reportTitle = 'Profit & Loss Statement';
              } else {
                const today = new Date().toISOString();
                pdfRes = await reportingService.getBalanceSheet(today);
                reportTitle = 'Balance Sheet';
              }

              // Check nesting
              const actualPdfStruct = pdfRes?.result || pdfRes;
              const link = actualPdfStruct?.pdfLink;

              const pdfUrl = link
                ? (link.startsWith('http')
                  ? link
                  : `https://api.isolaterp.ai${link.startsWith('/') ? '' : '/'}${link}`)
                : '#';

              addAssistantMessage(`Generated your ${reportTitle} using real-time ERP data.`, 'report', {
                title: reportTitle,
                summary: 'Real-time financial summary.',
                pdfLink: pdfUrl,
                htmlData: realData
              });
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
        } else if (intent.type === 'SEARCH_CUSTOMER') {
          addAssistantMessage(`Searching for customer: "${intent.params.query}"...`);
          const res = await reportingService.getCustomers(intent.params.query);
          const customers = res.result?.result || res.result || [];
          if (customers && customers.length > 0) {
            const list = customers.map((c: any) => `• ${c.customerTitle} (ID: ${c.id})`).join('\n');
            addAssistantMessage(`I found ${customers.length} matching customers:\n\n${list}`);
          } else {
            addAssistantMessage(`No customers found matching "${intent.params.query}".`);
          }
        } else if (intent.type === 'LIST_CUSTOMERS') {
          addAssistantMessage('Retrieving customer list...');
          const res = await reportingService.getCustomers();
          const customers = res.result?.result || res.result || [];
          if (Array.isArray(customers) && customers.length > 0) {
            const list = customers.slice(0, 20).map((c: any) => `• ${c.customerTitle}`).join('\n');
            addAssistantMessage(`Found ${customers.length} customers (showing top 20):\n\n${list}`);
          } else {
            addAssistantMessage('Could not retrieve customers or the list is empty.');
          }
        } else if (intent.type === 'LIST_ITEMS') {
          addAssistantMessage('Retrieving inventory items...');
          const res = await reportingService.getItems();
          const items = res.result?.result || res.result || [];
          if (Array.isArray(items) && items.length > 0) {
            const list = items.slice(0, 20).map((i: any) => `• ${i.itemTitle || i.inventoryItemTitle}`).join('\n');
            addAssistantMessage(`Found ${items.length} items in inventory (showing top 20):\n\n${list}`);
          } else {
            addAssistantMessage('Could not retrieve items or the list is empty.');
          }
        } else if (intent.type === 'LIST_VENDORS') {
          addAssistantMessage('Retrieving vendor list...');
          const res = await reportingService.getVendors();
          const vendors = res.result?.result || res.result || [];
          if (Array.isArray(vendors) && vendors.length > 0) {
            const list = vendors.slice(0, 20).map((v: any) => `• ${v.venderTitle || v.vendorTitle}`).join('\n');
            addAssistantMessage(`Found ${vendors.length} vendors (showing top 20):\n\n${list}`);
          } else {
            addAssistantMessage('Could not retrieve vendors or the list is empty.');
          }
        } else if (intent.type === 'HELP') {
          addAssistantMessage(`
**How to use ISOLATERP AI Accountant:**

1. **Authentication**: Mention your email, password, and tenant ID to login (e.g., "login with user@mail.com password 123 tenant XYZ").
2. **Reports**: Ask for "balance sheet" or "profit and loss" to see live data.
3. **Voice Control**: 
   - Click the 🎤 icon to speak.
   - Click the 🔊/🔈 icon to toggle AI voice output.
   - **Mic Permissions**: If the mic doesn't work, click the lock icon in your browser address bar and set 'Microphone' to 'Allow'.
4. **Data Entry**: Mention sales or purchases (e.g., "record a sale of 500").
5. **Context**: Use "switch company" to change your tenant context.

I currently support 136 ERP endpoints including Branches, Projects, Bank Transctions, and Invoices.`);
        } else if (intent.type === 'SWITCH_TENANT') {
          if (intent.params.pin) {
            const pin = intent.params.pin;
            addAssistantMessage(`Switching to company with PIN: ${pin}...`);
            // Force persistent update
            localStorage.setItem('tenantId', pin);
            // Update react state
            setSession(prev => ({ ...prev, tenantId: pin, data: { ...prev.data, tenantId: pin } }));

            // Small delay to ensure propagation if async effects exist (safety net)
            await new Promise(r => setTimeout(r, 500));

            addAssistantMessage(`Context switched to company (PIN: ${pin}). All subsequent requests will key off this Company ID.`);
          } else {
            setSession(prev => ({ ...prev, step: 'TENANT_SELECTION' }));
            // Attempt to get list from session if available
            const tenants = session.data?.tenants || [];
            if (tenants.length > 0) {
              const list = tenants.map((t: any, i: number) => `**${t.tenancyName}** (PIN: ${t.tenantId})`).join('\n');
              addAssistantMessage(`Here are your available companies. Please switch using the name or **PIN**:\n\n${list}`);
            } else {
              addAssistantMessage('Which company would you like to switch to? (Tip: You can say "Switch PIN XYZ")');
            }
          }
        } else {
          if (apiKey) {
            let aiMsg = await aiService.getAccountantResponse([...messages, userMessage], apiKey);

            // Check for valid JSON block with action
            const jsonMatch = aiMsg.match(/```json\n([\s\S]*?)\n```/) || aiMsg.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const rawJson = jsonMatch[1] || jsonMatch[0];
                const actionData = JSON.parse(rawJson);

                if (actionData.action === 'EXECUTE_API' && actionData.endpoint) {
                  addAssistantMessage(`Executing action on ${actionData.endpoint}...`);
                  const result = await api(actionData.endpoint, {
                    method: actionData.method || 'POST',
                    body: JSON.stringify(actionData.body || {})
                  });

                  if (result.success) {
                    addAssistantMessage(actionData.successMessage || 'Action completed successfully.');
                  } else {
                    addAssistantMessage(`Action failed: ${result.error || 'Unknown error'}`);
                  }
                } else {
                  // Just a regular message that happened to look like JSON or unhandled action
                  addAssistantMessage(aiMsg.replace(/```json[\s\S]*```/, '').trim() || aiMsg);
                }
              } catch (e) {
                // Failed to parse or execute, just show message
                addAssistantMessage(aiMsg);
              }
            } else {
              addAssistantMessage(aiMsg);
            }
          } else {
            addAssistantMessage("I'm not sure how to handle that request yet. I can help with bookkeeping, reports, and tenant management.");
          }
        }
      }
    } catch (error) {
      console.error(error);
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
                    <div className="report-meta" style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
                      Source: Live ERP • Tenant: {session.tenantId || 'Default'}
                    </div>
                    <div className="report-summary">
                      {msg.data?.summary || 'The requested financial statement has been generated successfully.'}
                    </div>
                    <div className="report-actions">
                      <a href={msg.data?.pdfLink || '#'} target="_blank" className="btn-download" rel="noreferrer">
                        📥 Download PDF
                      </a>
                      <button className="btn-view" onClick={() => setShowReportModal(msg.data)}>
                        👁️ View HTML
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {showReportModal && (
            <div className="report-modal-overlay" onClick={() => setShowReportModal(null)}>
              <div className="report-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{showReportModal.title}</h2>
                  <button className="close-btn" onClick={() => setShowReportModal(null)}>×</button>
                </div>
                <div className="modal-body">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Category / Account</th>
                        <th className="amount-col">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showReportModal.htmlData?.map((cat: any, ci: number) => (
                        <React.Fragment key={ci}>
                          <tr className="category-row">
                            <td colSpan={2}>{cat.category}</td>
                          </tr>
                          {cat.items.map((item: any, ii: number) => (
                            <tr key={ii}>
                              <td>{item.name}</td>
                              <td className="amount-col">${item.amount}</td>
                            </tr>
                          ))}
                          <tr className="total-row">
                            <td>Total {cat.category}</td>
                            <td className="amount-col">${cat.total}</td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-footer">
                  <a href={showReportModal.pdfLink} target="_blank" className="btn-download" rel="noreferrer">
                    Download Full PDF Report
                  </a>
                </div>
              </div>
            </div>
          )}
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
