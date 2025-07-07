import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// Credenciais da API Sienge
const SIENGE_USER = "silvapacker-eddy";
const SIENGE_PASSWORD = "dzTk2FW210bwhTBMfqNuyJAAifFICYGs";
const SIENGE_API_URL = "https://api.sienge.com.br/silvapacker/public/api/v1/supply-contracts/all";
const SIENGE_MEASUREMENTS_API_URL = "https://api.sienge.com.br/silvapacker/public/api/v1/supply-contracts/measurements/all";

// Rota para buscar contratos
app.get('/api/contracts', async (req, res) => {
    try {
        const allContracts = [];
        let offset = 0;
        const limit = 200;

        // Codifica as credenciais em Base64 para Basic Auth
        const credentials = Buffer.from(`${SIENGE_USER}:${SIENGE_PASSWORD}`).toString('base64');

        const headers = {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        };

        while (true) {
            const params = new URLSearchParams({
                contractStartDate: "2020-01-01",
                contractEndDate: "2030-12-31",
                limit: limit.toString(),
                offset: offset.toString()
            });

            const url = `${SIENGE_API_URL}?${params}`;

            try {
                const response = await fetch(url, { headers });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const contractsPage = data.results || [];

                if (contractsPage.length === 0) {
                    break;
                }

                allContracts.push(...contractsPage);
                offset += limit;

            } catch (fetchError) {
                console.error('Erro na requisição:', fetchError);
                throw fetchError;
            }
        }

        // Adicionar a coluna 'valorTotal' aos contratos
        allContracts.forEach(contract => {
            const laborValue = parseFloat(contract.totalLaborValue || 0);
            const materialValue = parseFloat(contract.totalMaterialValue || 0);
            contract.valorTotal = laborValue + materialValue;
        });

        // Buscar medições para todos os contratos
        const allMeasurements = await fetchAllMeasurements(headers);
        console.log(`🔍 Debug: Total de contratos: ${allContracts.length}`);
        console.log(`📊 Debug: Total de medições: ${allMeasurements.length}`);
        
        // Calcular valores medidos e saldos para cada contrato
        const contractsWithMeasurements = calculateMeasurementsData(allContracts, allMeasurements);
        
        res.json(contractsWithMeasurements);

    } catch (error) {
        console.error('Erro ao buscar contratos:', error);
        res.status(500).json({
            error: `Erro ao buscar contratos: ${error.message}`,
            details: error.stack
        });
    }
});

// Função para buscar todas as medições com paginação
async function fetchAllMeasurements(headers) {
    const allMeasurements = [];
    let offset = 0;
    const limit = 200;

    while (true) {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });

        const url = `${SIENGE_MEASUREMENTS_API_URL}?${params}`;

        try {
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
               console.warn(`⚠️ Erro ao buscar medições (offset ${offset}):`, response.status, response.statusText);
               const errorText = await response.text();
               console.warn(`📄 Resposta do erro:`, errorText);
               break;
            }

            const data = await response.json();
           console.log(`📊 Página ${Math.floor(offset/limit) + 1}: ${measurementsPage.length} medições`);
            const measurementsPage = data.results || [];

            if (measurementsPage.length === 0) {
                break;
            }

            allMeasurements.push(...measurementsPage);
            offset += limit;

        } catch (fetchError) {
            console.error('Erro na requisição de medições:', fetchError);
           console.error('📍 URL tentada:', url);
            break;
        }
    }

   console.log(`✅ TOTAL de medições encontradas: ${allMeasurements.length}`);
   
   // Debug: mostrar algumas medições de exemplo
   if (allMeasurements.length > 0) {
       console.log(`🔍 Exemplo de medição:`, JSON.stringify(allMeasurements[0], null, 2));
   }
   
    return allMeasurements;
}

// Função para calcular dados de medições por contrato
function calculateMeasurementsData(contracts, measurements) {
    console.log(`🔧 Calculando medições para ${contracts.length} contratos com ${measurements.length} medições`);
    
    // Agrupar medições por contractId
    const measurementsByContract = {};
    
    measurements.forEach(measurement => {
        const contractId = measurement.contractId;
        if (!measurementsByContract[contractId]) {
            measurementsByContract[contractId] = [];
        }
        measurementsByContract[contractId].push(measurement);
    });

    console.log(`📋 Contratos com medições: ${Object.keys(measurementsByContract).length}`);
    
    // Calcular valores para cada contrato
    const result = contracts.map(contract => {
        const contractMeasurements = measurementsByContract[contract.id] || [];
        
        // Calcular valor total medido
        const totalMeasuredValue = contractMeasurements.reduce((sum, measurement) => {
            const laborValue = parseFloat(measurement.totalLaborValue || 0);
            const materialValue = parseFloat(measurement.totalMaterialValue || 0);
            return sum + laborValue + materialValue;
        }, 0);
        
        // Calcular saldo (valor total do contrato - valor medido)
        const contractTotalValue = parseFloat(contract.valorTotal || 0);
        const remainingBalance = contractTotalValue - totalMeasuredValue;
        
        // Debug para alguns contratos
        if (contractMeasurements.length > 0) {
            console.log(`📊 Contrato ${contract.contractNumber}: ${contractMeasurements.length} medições, Valor medido: R$ ${totalMeasuredValue.toFixed(2)}, Saldo: R$ ${remainingBalance.toFixed(2)}`);
        }
        
        return {
            ...contract,
            valorMedido: totalMeasuredValue,
            saldoContrato: remainingBalance,
            numeroMedicoes: contractMeasurements.length
        };
    });
   
   console.log(`✅ Processamento concluído`);
   return result;
}

// Rota para servir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Rota catch-all para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Portal de Contratos Sienge disponível`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});