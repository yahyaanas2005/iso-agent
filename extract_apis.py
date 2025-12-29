import json

def extract_apis():
    with open('IsolateERP_APIs_Combined_Deduped.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    keywords = ['Ledger', 'Bank', 'Tenant', 'Item', 'Customer', 'Company', 'Profit']
    extracted = []

    for ep in data.get('endpoints', []):
        path = ep.get('path')
        if not path:
             continue
             
        # Filter for relevant GET/POST endpoints that might match the user's "List" or "Report" needs
        try:
            if any(k and path and k.lower() in path.lower() for k in keywords):
                 # Simplify schema for the LLM
                 params_list = []
                 params_val = ep.get('parameters')
                 if params_val and isinstance(params_val, list):
                     params_list = [p.get('name') for p in params_val if p and isinstance(p, dict) and p.get('in') == 'query']
                     
                 simple_ep = {
                     "path": "/api" + path if not path.startswith("/api") else path, # Normalize path (guessing prefix based on existing code)
                     "method": ep.get('method'),
                     "summary": ep.get('summary'),
                     "params": params_list
                 }

                 # Extract Request Body example if it exists
                 if 'requestBody' in ep and ep['requestBody'] and 'content' in ep['requestBody']:
                     content = ep['requestBody']['content']
                     if content and 'application/json' in content:
                         schema = content['application/json'].get('schema', {})
                         props = schema.get('properties', {})
                         if props:
                             simple_ep['body_example'] = props
            
                 extracted.append(simple_ep)
        except Exception as e:
            continue

    # Print top 50 matches formatted for the system prompt
    print("## ADDITIONAL CONTEXT: KNOWN ERP APIs")
    for ep in extracted[:50]: # Limit to avoid context overflow for now
        print(f"- {ep['summary']} ({ep['method']} {ep['path']})")
        if 'params' in ep and ep['params']:
            print(f"  Params: {', '.join(ep['params'])}")
        if 'body_example' in ep:
            print(f"  Body: {json.dumps(ep['body_example'])}")
        print("")

if __name__ == '__main__':
    extract_apis()
