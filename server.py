#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.parse
import urllib.request
import base64
import os
from datetime import datetime

class ContractHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="static", **kwargs)
    
    def do_GET(self):
        if self.path == '/api/contracts':
            self.handle_contracts()
        else:
            super().do_GET()
    
    def handle_contracts(self):
        try:
            # Credenciais da API Sienge
            SIENGE_USER = "silvapacker-eddy"
            SIENGE_PASSWORD = "dzTk2FW210bwhTBMfqNuyJAAifFICYGs"
            SIENGE_API_URL = "https://api.sienge.com.br/silvapacker/public/api/v1/supply-contracts/all"
            
            all_contracts = []
            offset = 0
            limit = 200
            
            # Codifica as credenciais em Base64 para Basic Auth
            credentials = f"{SIENGE_USER}:{SIENGE_PASSWORD}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            while True:
                # Constrói a URL com parâmetros
                params = urllib.parse.urlencode({
                    "contractStartDate": "2020-01-01",
                    "contractEndDate": "2030-12-31",
                    "limit": limit,
                    "offset": offset
                })
                
                url = f"{SIENGE_API_URL}?{params}"
                
                # Cria a requisição
                req = urllib.request.Request(url)
                req.add_header('Authorization', f'Basic {encoded_credentials}')
                req.add_header('Content-Type', 'application/json')
                
                # Faz a requisição
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                    contracts_page = data.get("results", [])
                    
                    if not contracts_page:
                        break
                    
                    all_contracts.extend(contracts_page)
                    offset += limit
            
            # Adicionar a coluna 'valorTotal' aos contratos
            for contract in all_contracts:
                labor_value = float(contract.get("totalLaborValue", 0.0) or 0.0)
                material_value = float(contract.get("totalMaterialValue", 0.0) or 0.0)
                contract["valorTotal"] = labor_value + material_value
            
            # Resposta JSON
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(all_contracts).encode())
            
        except Exception as e:
            # Resposta de erro
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {"error": f"Erro ao buscar contratos: {str(e)}"}
            self.wfile.write(json.dumps(error_response).encode())
    
    def log_message(self, format, *args):
        # Log personalizado
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

def run_server(port=8000):
    with socketserver.TCPServer(("", port), ContractHandler) as httpd:
        print(f"Servidor rodando em http://localhost:{port}")
        print("Pressione Ctrl+C para parar o servidor")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor parado.")

if __name__ == "__main__":
    run_server()