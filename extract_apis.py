import json

def extract_apis():
    with open('IsolateERP_APIs_Combined_Deduped.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    seen_paths = set()
    extracted = []
    
    for ep in data.get('endpoints', []):
        path = ep.get('path')
        method = ep.get('method', 'GET').upper()
        if not path:
             continue
        
        # Normalize path
        full_path = "/api" + path if not path.startswith("/api") else path
        unique_key = f"{method}:{full_path}"
        
        if unique_key in seen_paths:
            continue
        seen_paths.add(unique_key)

        summary = ep.get('summary') or ep.get('title') or "No description"
        
        # Compact format for LLM Token efficiency
        # Format: METHOD Path | Summary
        line = f"{method} {full_path} | {summary}"
        extracted.append(line)

    # Sort for stability
    extracted.sort()

    print("export const ERP_API_KNOWLEDGE = `")
    print("## COMPLETE ERP API DIRECTORY")
    print("Use these APIs to fulfill user requests. If parameters are needed, infer them or ask the user.")
    for line in extracted:
        # Escape backticks if any
        safe_line = line.replace("`", "'")
        print(f"- {safe_line}")
    print("`;")

if __name__ == '__main__':
    extract_apis()
