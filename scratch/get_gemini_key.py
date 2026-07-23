import urllib.request
import json

api_key = "rnd_3N8qLigUOkfnrGz7V4b6qXCpk6LB"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

# 1. Fetch GEMINI_API_KEY from Departement-chief (srv-d6qbdengi27c73a0154g)
dep_chief_id = "srv-d6qbdengi27c73a0154g"
env_url_dep = f"https://api.render.com/v1/services/{dep_chief_id}/env-vars"
req_get_dep = urllib.request.Request(env_url_dep, headers=headers)

gemini_key_val = None
try:
    with urllib.request.urlopen(req_get_dep) as response:
        env_vars = json.loads(response.read().decode())
        for ev in env_vars:
            var = ev['envVar']
            if var['key'] == "GEMINI_API_KEY":
                gemini_key_val = var['value']
                print("Found GEMINI_API_KEY in Departement-chief!")
                break
except Exception as e:
    print("Error fetching Departement-chief env vars:", e)

if not gemini_key_val:
    print("Failed to find GEMINI_API_KEY!")
    exit(1)

# 2. Fetch current env vars of wolfie-backend (srv-d8hghesvikkc73f85akg)
backend_id = "srv-d8hghesvikkc73f85akg"
env_url_backend = f"https://api.render.com/v1/services/{backend_id}/env-vars"
req_get_backend = urllib.request.Request(env_url_backend, headers=headers)

try:
    with urllib.request.urlopen(req_get_backend) as response:
        backend_env_vars = json.loads(response.read().decode())
        
    updated_env_vars = []
    found = False
    
    for ev in backend_env_vars:
        var = ev['envVar']
        key = var['key']
        value = var['value']
        if key == "GEMINI_API_KEY":
            value = gemini_key_val
            found = True
        updated_env_vars.append({"key": key, "value": value})
        
    if not found:
        updated_env_vars.append({"key": "GEMINI_API_KEY", "value": gemini_key_val})
        
    # 3. PUT updated env vars back to wolfie-backend
    req_put = urllib.request.Request(env_url_backend, data=json.dumps(updated_env_vars).encode(), headers=headers, method="PUT")
    with urllib.request.urlopen(req_put) as put_response:
        print("Successfully updated GEMINI_API_KEY in Render wolfie-backend!")
        
    # 4. Trigger manual deploy of wolfie-backend
    deploy_url = f"https://api.render.com/v1/services/{backend_id}/deploys"
    req_deploy = urllib.request.Request(deploy_url, data=b"{}", headers=headers, method="POST")
    with urllib.request.urlopen(req_deploy) as deploy_response:
        print("Triggered deploy on wolfie-backend!")
        
except Exception as e:
    print("Error updating backend:", e)
