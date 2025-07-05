
import requests
from flask import Blueprint, jsonify
import base64

contracts_bp = Blueprint("contracts", __name__)

# Credenciais da API Sienge
SIENGE_USER = "silvapacker-eddy"
SIENGE_PASSWORD = "dzTk2FW210bwhTBMfqNuyJAAifFICYGs"
SIENGE_API_URL = "https://api.sienge.com.br/silvapacker/public/api/v1/supply-contracts/all"

@contracts_bp.route("/api/contracts", methods=["GET"])
def get_contracts():
    all_contracts = []
    offset = 0
    limit = 200  # Limite máximo por requisição

    try:
        # Codifica as credenciais em Base64 para Basic Auth
        credentials = f"{SIENGE_USER}:{SIENGE_PASSWORD}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json"
        }

        while True:
            params = {
                "contractStartDate": "2020-01-01",
                "contractEndDate": "2030-12-31",
                "limit": limit,
                "offset": offset
            }

            response = requests.get(SIENGE_API_URL, headers=headers, params=params)
            response.raise_for_status()  # Levanta um erro para códigos de status HTTP ruins (4xx ou 5xx)

            data = response.json()
            contracts_page = data.get("results", [])

            if not contracts_page:
                break  # Sai do loop se não houver mais contratos

            all_contracts.extend(contracts_page)
            offset += limit

        # Adicionar a coluna 'valorTotal' aos contratos
        for contract in all_contracts:
            labor_value = float(contract.get("totalLaborValue", 0.0) or 0.0)
            material_value = float(contract.get("totalMaterialValue", 0.0) or 0.0)
            contract["valorTotal"] = labor_value + material_value

        return jsonify(all_contracts)

    except requests.exceptions.HTTPError as http_err:
        return jsonify({"error": f"HTTP error occurred: {http_err}", "details": response.text}), response.status_code
    except requests.exceptions.ConnectionError as conn_err:
        return jsonify({"error": f"Connection error occurred: {conn_err}"}), 500
    except requests.exceptions.Timeout as timeout_err:
        return jsonify({"error": f"Timeout error occurred: {timeout_err}"}), 500
    except requests.exceptions.RequestException as req_err:
        return jsonify({"error": f"An error occurred: {req_err}"}), 500


