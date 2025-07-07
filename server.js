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

// Possíveis endpoints de medições para testar
const POSSIBLE_MEASUREMENTS_ENDPOINTS = [
    "https://api.sienge.com.br/silvapacker/public/api/v1/supply-contracts/measurements/all",
    "https://api.sienge.com.br/silvapacker/public/api/v1/measurements/all",
    "https://api.sienge.com.br/silvapacker/public/api/v1/supply-contracts/measurements",
    "https://api.sienge.com.br/silvapacker/public/api/v1/measurements",
    "https://api.sienge.com.br/silvapacker/public/api/v1/contracts/measurements/all",
    "https://api.sienge.com.br/silvapacker/public/api/v1/contracts/measurements"
];

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
        
        // Se não conseguiu buscar medições, definir valores padrão
        if (allMeasurements.length === 0) {
            console.warn(`⚠️ Como não foram encontradas medições, definindo valores padrão (0) para todas as colunas de medição`);
            const contractsWithDefaults = allContracts.map(contract => ({
                ...contract,
                valorMedido: 0,
                saldoContrato: contract.valorTotal || 0,
                numeroMedicoes: 0
            }));
            return res.json(contractsWithDefaults);
        }
        
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
    
    console.log(`🔍 Testando ${POSSIBLE_MEASUREMENTS_ENDPOINTS.length} possíveis endpoints de medições...`);
    
    // Testar cada endpoint possível
    for (let i = 0; i < POSSIBLE_MEASUREMENTS_ENDPOINTS.length; i++) {
        const testEndpoint = POSSIBLE_MEASUREMENTS_ENDPOINTS[i];
        console.log(`\n📡 Teste ${i + 1}/${POSSIBLE_MEASUREMENTS_ENDPOINTS.length}: ${testEndpoint}`);
        
        try {
            const params = new URLSearchParams({
                limit: "10", // Usar limite pequeno para teste
                offset: "0"
            });
            
            const testUrl = `${testEndpoint}?${params}`;
            const response = await fetch(testUrl, { headers });
            
            console.log(`   Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`   ✅ SUCESSO! Estrutura da resposta:`, Object.keys(data));
                
                if (data.results && Array.isArray(data.results)) {
                    console.log(`   📊 Encontradas ${data.results.length} medições na primeira página`);
                    if (data.results.length > 0) {
                        console.log(`   🔍 Exemplo de medição:`, JSON.stringify(data.results[0], null, 2));
                    }
                    
                    // Endpoint encontrado! Agora buscar todas as medições
                    console.log(`\n🎯 Endpoint correto encontrado: ${testEndpoint}`);
                    return await fetchAllMeasurementsFromEndpoint(testEndpoint, headers);
                }
            } else {
                const errorText = await response.text();
                console.log(`   ❌ Erro: ${errorText.substring(0, 200)}...`);
            }
            
        } catch (error) {
            console.log(`   💥 Exceção: ${error.message}`);
        }
    }
   
    console.log(`\n❌ NENHUM endpoint de medições funcionou!`);
    console.log(`⚠️ Possíveis causas:`);
    console.log(`   1. Endpoint de medições não existe na API`);
    console.log(`   2. Credenciais sem permissão para acessar medições`);
    console.log(`   3. API de medições requer autenticação diferente`);
    console.log(`   4. Estrutura da URL completamente diferente`);
    
    return allMeasurements;
}

// Função para buscar todas as medições de um endpoint específico
async function fetchAllMeasurementsFromEndpoint(endpoint, headers) {
    const allMeasurements = [];
    let offset = 0;
    const limit = 200;

    console.log(`📥 Buscando todas as medições do endpoint: ${endpoint}`);

    while (true) {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });

        const url = `${endpoint}?${params}`;

        try {
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                console.error(`❌ Erro ${response.status} na página ${Math.floor(offset/limit) + 1}`);
                break;
            }

            const data = await response.json();
            const measurementsPage = data.results || [];
            console.log(`📊 Página ${Math.floor(offset/limit) + 1}: ${measurementsPage.length} medições`);

            if (measurementsPage.length === 0) {
                break;
            }

            allMeasurements.push(...measurementsPage);
            offset += limit;

        } catch (fetchError) {
            console.error(`💥 Erro na página ${Math.floor(offset/limit) + 1}:`, fetchError.message);
            break;
        }
    }

    console.log(`✅ TOTAL de medições encontradas: ${allMeasurements.length}`);
   
    return allMeasurements;
}

// Função para calcular dados de medições por contrato
function calculateMeasurementsData(contracts, measurements) {
    console.log(`🔧 Calculando medições para ${contracts.length} contratos com ${measurements.length} medições`);
    
    // Agrupar medições por contractId
    const measurementsByContract = {};
    
    measurements.forEach(measurement => {
        // Tentar diferentes campos possíveis para o ID do contrato
        const contractId = measurement.contractId || measurement.supplyContractId || measurement.contract_id || measurement.id;
        
        if (!measurementsByContract[contractId]) {
            measurementsByContract[contractId] = [];
        }
        measurementsByContract[contractId].push(measurement);
    });

    console.log(`📋 Contratos com medições: ${Object.keys(measurementsByContract).length}`);
    console.log(`🔍 IDs de contratos com medições:`, Object.keys(measurementsByContract).slice(0, 10));
    
    // Debug: mostrar estrutura de uma medição
    if (measurements.length > 0) {
        console.log(`🔍 Estrutura da primeira medição:`, JSON.stringify(measurements[0], null, 2));
    }
    
    // Calcular valores para cada contrato
    const result = contracts.map(contract => {
        // Tentar diferentes campos possíveis para o ID do contrato
        const contractId = contract.id || contract.contractId || contract.contract_id;
        const contractMeasurements = measurementsByContract[contractId] || [];
        
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
        if (contractMeasurements.length > 0 || contract.contractNumber === '10') {
            console.log(`📊 Contrato ${contract.contractNumber} (ID: ${contractId}): ${contractMeasurements.length} medições, Valor medido: R$ ${totalMeasuredValue.toFixed(2)}, Saldo: R$ ${remainingBalance.toFixed(2)}`);
        }
        
        return {
            ...contract,
            valorMedido: totalMeasuredValue,
            saldoContrato: remainingBalance,
            numeroMedicoes: contractMeasurements.length
        };
    });
   
   // Debug final
   const contractsWithMeasurements = result.filter(c => c.numeroMedicoes > 0);
   console.log(`✅ Processamento concluído: ${contractsWithMeasurements.length} contratos têm medições`);
   
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