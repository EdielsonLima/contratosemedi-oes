import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import AttachmentDB from './database.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Configurações para retry e timeout
const RETRY_CONFIG = {
    maxRetries: 3,
    retryDelay: 2000, // 2 segundos
    timeout: 30000 // 30 segundos
};

// Função utilitária para fazer requisições com retry e timeout
async function fetchWithRetry(url, options = {}, retries = RETRY_CONFIG.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), RETRY_CONFIG.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Check for transient HTTP errors that should be retried
            const isTransientHttpError = !response.ok && (
                (response.status >= 500 && response.status <= 599) || // 5xx server errors
                response.status === 429 // Too Many Requests
            );
            
            if (isTransientHttpError && attempt < retries) {
                console.log(`⚠️ Tentativa ${attempt}/${retries} falhou para ${url}: HTTP ${response.status} ${response.statusText}`);
                console.log(`🔄 Tentando novamente em ${RETRY_CONFIG.retryDelay}ms...`);
                
                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
                continue;
            }
            
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            const isNetworkError = error.name === 'AbortError' || 
                                 error.code === 'ECONNRESET' || 
                                 error.message.includes('socket hang up') ||
                                 error.message.includes('timeout') ||
                                 error.message.includes('ENOTFOUND') ||
                                 error.message.includes('ECONNREFUSED');
            
            if (isNetworkError && attempt < retries) {
                console.log(`⚠️ Tentativa ${attempt}/${retries} falhou para ${url}: ${error.message}`);
                console.log(`🔄 Tentando novamente em ${RETRY_CONFIG.retryDelay}ms...`);
                
                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
                continue;
            }
            
            // Se não é erro de rede ou esgotaram as tentativas, relançar o erro
            throw error;
        }
    }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
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
                const response = await fetchWithRetry(url, { headers });
                
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
            
            // DEBUG ESPECÍFICO: Procurar contrato número 2
            if (contract.contractNumber === '2' || contract.contractNumber === 2) {
                console.log('\n🎯 ===== CONTRATO NÚMERO 2 ENCONTRADO =====');
                console.log('📋 Todos os campos:', Object.keys(contract));
                console.log('📄 Contrato completo:', JSON.stringify(contract, null, 2));
                
                if (contract.securityDeposit) {
                    console.log('✅ OBJETO securityDeposit ENCONTRADO:', JSON.stringify(contract.securityDeposit, null, 2));
                } else {
                    console.log('❌ OBJETO securityDeposit NÃO ENCONTRADO');
                }
                
                console.log('🎯 ===== FIM DEBUG CONTRATO 2 =====\n');
            }
        });

        // Buscar medições para todos os contratos
        const allMeasurements = await fetchAllMeasurements(headers);
        console.log(`🔍 Debug: Total de contratos: ${allContracts.length}`);
        console.log(`📊 Debug: Total de medições: ${allMeasurements.length}`);
        
        // Buscar anexos para todos os contratos
        const contractsWithAttachments = await addAttachmentCounts(allContracts);
        
        // Se não conseguiu buscar medições, definir valores padrão
        if (allMeasurements.length === 0) {
            console.warn(`⚠️ Como não foram encontradas medições, definindo valores padrão (0) para todas as colunas de medição`);
            const contractsWithDefaults = contractsWithAttachments.map(contract => ({
                ...contract,
                valorMedido: 0,
                saldoContrato: contract.valorTotal || 0,
                numeroMedicoes: 0
            }));
            return res.json(contractsWithDefaults);
        }
        
        // Calcular valores medidos e saldos para cada contrato
        const contractsWithMeasurements = calculateMeasurementsData(contractsWithAttachments, allMeasurements);
        
        // DEBUG: Verificar se os valores de caução estão sendo calculados
        console.log('🔍 SERVER - Verificando valores de caução calculados...');
        const contractsWithRetentionServer = contractsWithMeasurements.filter(c => c.retentionValue && c.retentionValue > 0);
        console.log(`📊 SERVER - Contratos com caução: ${contractsWithRetentionServer.length} de ${contractsWithMeasurements.length}`);
        
        if (contractsWithRetentionServer.length > 0) {
            console.log('✅ SERVER - Exemplo de contrato com caução:');
            console.log(`Contrato ${contractsWithRetentionServer[0].contractNumber}: R$ ${contractsWithRetentionServer[0].retentionValue}`);
        }
        
        res.json(contractsWithMeasurements);

    } catch (error) {
        console.error('Erro ao buscar contratos:', error);
        res.status(500).json({
            error: `Erro ao buscar contratos: ${error.message}`,
            details: error.stack
        });
    }
});

// Rota para buscar medições da API Sienge
app.get('/api/measurements', async (req, res) => {
    try {
        console.log('🔄 Buscando medições da API Sienge...');
        
        const allMeasurements = [];
        let offset = 0;
        const limit = 200;

        // Codifica as credenciais em Base64 para Basic Auth
        const credentials = Buffer.from(`${SIENGE_USER}:${SIENGE_PASSWORD}`).toString('base64');

        const headers = {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        };

        const measurementsEndpoint = "https://api.sienge.com.br/silvapacker/public/api/v1/supply-contracts/measurements/all";

        while (true) {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });

            const url = `${measurementsEndpoint}?${params}`;
            console.log(`📡 Buscando página ${Math.floor(offset/limit) + 1}: ${url}`);

            try {
                const response = await fetchWithRetry(url, { headers });
                
                if (!response.ok) {
                    console.error(`❌ Erro ${response.status} na página ${Math.floor(offset/limit) + 1}`);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const measurementsPage = data.results || [];
                console.log(`📊 Página ${Math.floor(offset/limit) + 1}: ${measurementsPage.length} medições`);

                if (measurementsPage.length === 0) {
                    break;
                }

                allMeasurements.push(...measurementsPage);
                offset += limit;

                // Debug: mostrar estrutura da primeira medição
                if (allMeasurements.length === measurementsPage.length && measurementsPage.length > 0) {
                    console.log('🔍 Estrutura da primeira medição:');
                    console.log(JSON.stringify(measurementsPage[0], null, 2));
                    console.log('🔍 Campos disponíveis:', Object.keys(measurementsPage[0]));
                }

            } catch (fetchError) {
                console.error(`💥 Erro na página ${Math.floor(offset/limit) + 1}:`, fetchError.message);
                break;
            }
        }

        console.log(`✅ TOTAL de medições encontradas: ${allMeasurements.length}`);
        
        res.json(allMeasurements);

    } catch (error) {
        console.error('❌ Erro ao buscar medições:', error);
        res.status(500).json({
            error: `Erro ao buscar medições: ${error.message}`,
            details: error.stack
        });
    }
});

// Rota para buscar anexos de um contrato
app.get('/api/contracts/:contractNumber/attachments', async (req, res) => {
    try {
        const { contractNumber } = req.params;
        console.log(`🔍 Buscando anexos para contrato: ${contractNumber}`);
        
        const attachments = await AttachmentDB.getByContract(contractNumber);
        
        res.json(attachments);
    } catch (error) {
        console.error('❌ Erro ao buscar anexos:', error);
        res.status(500).json({ error: 'Erro ao buscar anexos' });
    }
});

// Rota para enviar anexo
app.post('/api/contracts/:contractNumber/attachments', async (req, res) => {
    try {
        const { contractNumber } = req.params;
        const { fileName, fileData, fileSize } = req.body;
        
        console.log(`📎 Upload de anexo - Contrato: ${contractNumber}, Arquivo: ${fileName}, Tamanho: ${fileSize} bytes`);
        
        if (!fileName || !fileData) {
            console.log(`❌ Dados inválidos: fileName ou fileData ausentes`);
            return res.status(400).json({ error: 'Nome do arquivo e dados são obrigatórios' });
        }
        
        // Salvar no banco de dados SQLite
        const attachment = await AttachmentDB.insert(contractNumber, fileName, fileData, fileSize);
        
        res.json({ 
            id: attachment.id,
            message: 'Anexo salvo com sucesso' 
        });
        
    } catch (error) {
        console.error('❌ ERRO CRÍTICO ao salvar anexo:', error);
        res.status(500).json({ error: 'Erro ao salvar anexo' });
    }
});

// Rota para baixar anexo
app.get('/api/attachments/:id/download', async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.id);
        console.log(`📥 Download solicitado para anexo ID: ${attachmentId}`);
        
        const attachment = await AttachmentDB.getById(attachmentId);
        
        if (!attachment) {
            console.log(`❌ Anexo não encontrado: ID ${attachmentId}`);
            return res.status(404).json({ error: 'Anexo não encontrado' });
        }
        
        // Converter Base64 de volta para buffer
        const buffer = Buffer.from(attachment.fileData, 'base64');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
        res.send(buffer);
        
        console.log(`✅ Download concluído: ${attachment.fileName}`);
        
    } catch (error) {
        console.error('Erro ao baixar anexo:', error);
        res.status(500).json({ error: 'Erro ao baixar anexo' });
    }
});

// Rota para excluir anexo
app.delete('/api/attachments/:id', async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.id);
        console.log(`🗑️ Solicitação de exclusão para anexo ID: ${attachmentId}`);
        
        const success = await AttachmentDB.deleteById(attachmentId);
        
        if (success) {
            res.json({ message: 'Anexo excluído com sucesso' });
        } else {
            res.status(404).json({ error: 'Anexo não encontrado' });
        }
        
    } catch (error) {
        console.error('Erro ao excluir anexo:', error);
        res.status(500).json({ error: 'Erro ao excluir anexo' });
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
            const response = await fetchWithRetry(testUrl, { headers });
            
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
            const response = await fetchWithRetry(url, { headers });
            
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
    
    // Debug: mostrar estrutura de uma medição
    if (measurements.length > 0) {
        console.log(`🔍 Estrutura da primeira medição:`, JSON.stringify(measurements[0], null, 2));
        console.log(`🔍 Campos disponíveis na medição:`, Object.keys(measurements[0]));
        
        // DEBUG: Verificar campos relacionados a caução/retenção nas medições
        console.log('🔍 DEBUG CAUÇÃO/RETENÇÃO - PRIMEIRA MEDIÇÃO:');
        const possibleCautionFieldsMeasurement = Object.keys(measurements[0]).filter(key => 
            key.toLowerCase().includes('securitydepositvalue') ||
            key.toLowerCase().includes('securitydeposit') ||
            key.toLowerCase().includes('security') ||
            key.toLowerCase().includes('deposit') ||
            key.toLowerCase().includes('cauc') ||
            key.toLowerCase().includes('reten') ||
            key.toLowerCase().includes('guarantee') ||
            key.toLowerCase().includes('warranty') ||
            key.toLowerCase().includes('deduct') ||
            key.toLowerCase().includes('withhold')
        );
        
        console.log('🎯 Campos possíveis para caução/retenção nas medições:', possibleCautionFieldsMeasurement);
        
        // Mostrar valores desses campos
        possibleCautionFieldsMeasurement.forEach(field => {
            console.log(`   ${field}: ${measurements[0][field]}`);
        });
        
        // Verificar especificamente o campo securityDepositValue nas medições
        if (measurements[0].securityDepositValue !== undefined) {
            console.log(`✅ ENCONTRADO securityDepositValue na medição: ${measurements[0].securityDepositValue}`);
        } else if (measurements[0].securityDeposit) {
            console.log(`✅ ENCONTRADO objeto securityDeposit na medição:`, measurements[0].securityDeposit);
        } else {
            console.log(`❌ Nenhum campo de caução encontrado na medição`);
        }
    }
    
    // Debug: mostrar estrutura de um contrato
    if (contracts.length > 0) {
        console.log(`🔍 Estrutura do primeiro contrato:`, JSON.stringify(contracts[0], null, 2));
        console.log(`🔍 Campos disponíveis no contrato:`, Object.keys(contracts[0]));
    }
    
    // Agrupar medições por contractId usando diferentes estratégias
    const measurementsByContract = new Map();
    
    measurements.forEach((measurement, index) => {
        // Tentar diferentes campos possíveis para fazer a ligação
        const possibleKeys = [
            measurement.contractId,
            measurement.supplyContractId, 
            measurement.contract_id,
            measurement.id,
            measurement.contractNumber,
            measurement.contract_number
        ].filter(key => key !== undefined && key !== null);
        
        if (index < 5) { // Debug para as primeiras 5 medições
            console.log(`🔍 Medição ${index + 1} - Possíveis chaves:`, possibleKeys);
        }
        
        // Usar a primeira chave válida encontrada
        const contractKey = possibleKeys[0];
        
        if (contractKey) {
            if (!measurementsByContract.has(contractKey)) {
                measurementsByContract.set(contractKey, []);
            }
            measurementsByContract.get(contractKey).push(measurement);
        }
    });

    console.log(`📋 Total de chaves de contratos com medições: ${measurementsByContract.size}`);
    console.log(`🔍 Primeiras 10 chaves:`, Array.from(measurementsByContract.keys()).slice(0, 10));
    
    // Calcular valores para cada contrato
    const result = contracts.map((contract, index) => {
        // Tentar diferentes estratégias para encontrar as medições deste contrato
        const possibleContractKeys = [
            contract.id,
            contract.contractId,
            contract.contract_id,
            contract.contractNumber,
            contract.contract_number
        ].filter(key => key !== undefined && key !== null);
        
        if (index < 5) { // Debug para os primeiros 5 contratos
            console.log(`🔍 Contrato ${contract.contractNumber} - Possíveis chaves:`, possibleContractKeys);
        }
        
        // Procurar medições usando qualquer uma das chaves possíveis
        let contractMeasurements = [];
        for (const key of possibleContractKeys) {
            if (measurementsByContract.has(key)) {
                contractMeasurements = measurementsByContract.get(key);
                if (index < 5) {
                    console.log(`✅ Contrato ${contract.contractNumber} encontrou ${contractMeasurements.length} medições usando chave: ${key}`);
                }
                break;
            }
        }
        
        // Se não encontrou por ID, tentar por número do contrato
        if (contractMeasurements.length === 0) {
            for (const [key, measurements] of measurementsByContract.entries()) {
                // Verificar se alguma medição tem o mesmo número de contrato
                const matchingMeasurements = measurements.filter(m => 
                    m.contractNumber === contract.contractNumber ||
                    m.contract_number === contract.contractNumber
                );
                if (matchingMeasurements.length > 0) {
                    contractMeasurements = matchingMeasurements;
                    if (index < 5) {
                        console.log(`✅ Contrato ${contract.contractNumber} encontrou ${contractMeasurements.length} medições por número`);
                    }
                    break;
                }
            }
        }
        
        // Calcular valor total medido para este contrato específico
        const totalMeasuredValue = contractMeasurements.reduce((sum, measurement) => {
            const laborValue = parseFloat(measurement.totalLaborValue || 0);
            const materialValue = parseFloat(measurement.totalMaterialValue || 0);
            return sum + laborValue + materialValue;
        }, 0);
        
        // Calcular saldo (valor total do contrato - valor medido)
        const contractTotalValue = parseFloat(contract.valorTotal || 0);
        const remainingBalance = contractTotalValue - totalMeasuredValue;
        
        // Debug para contratos com medições
        if (contractMeasurements.length > 0) {
            console.log(`📊 Contrato ${contract.contractNumber}: ${contractMeasurements.length} medições, Valor medido: R$ ${totalMeasuredValue.toFixed(2)}, Saldo: R$ ${remainingBalance.toFixed(2)}`);
        }
        
        return {
            ...contract,
            valorMedido: totalMeasuredValue,
            saldoContrato: remainingBalance,
            numeroMedicoes: contractMeasurements.length,
            // Calcular valor de caução/retenção
            retentionValue: calculateRetentionValue(contract, contractMeasurements)
        };
    });
   
    // Debug final
    const contractsWithMeasurements = result.filter(c => c.numeroMedicoes > 0);
    console.log(`✅ Processamento concluído: ${contractsWithMeasurements.length} contratos têm medições`);
    
    return result;
}

// Função para calcular valor de caução/retenção
function calculateRetentionValue(contract, measurements) {
    // 1. Verificar se existe objeto securityDeposit no contrato
    if (contract.securityDeposit) {
        console.log(`🔍 CAUÇÃO - Contrato ${contract.contractNumber}: Encontrado objeto securityDeposit:`, contract.securityDeposit);
        
        // Verificar saldo da caução
        const securityDepositBalance = parseFloat(contract.securityDeposit.securityDepositBalance || 0);
        if (securityDepositBalance > 0) {
            console.log(`💰 CAUÇÃO - Contrato ${contract.contractNumber}: securityDepositBalance R$ ${securityDepositBalance}`);
            return securityDepositBalance;
        }
        
        // Se não tem saldo, verificar se tem porcentagem para calcular
        const securityDepositPercentage = parseFloat(contract.securityDeposit.securityDepositPercentage || 0);
        if (securityDepositPercentage > 0) {
            // Calcular caução baseado nas medições usando a porcentagem do contrato
            const totalMeasuredValue = measurements.reduce((sum, measurement) => {
                const laborValue = parseFloat(measurement.totalLaborValue || 0);
                const materialValue = parseFloat(measurement.totalMaterialValue || 0);
                return sum + laborValue + materialValue;
            }, 0);
            
            const totalContractValue = parseFloat(contract.valorTotal || 0);
            
            // Usar valor medido se existir, senão usar valor total do contrato
            const baseValue = totalMeasuredValue > 0 ? totalMeasuredValue : totalContractValue;
            const calculatedRetention = (baseValue * securityDepositPercentage) / 100;
            
            console.log(`💰 CAUÇÃO - Contrato ${contract.contractNumber}: ${securityDepositPercentage}% de R$ ${baseValue} = R$ ${calculatedRetention}`);
            return calculatedRetention;
        }
        
        // Se tem objeto securityDeposit mas sem valores, pode ter outros campos
        const securityDepositValue = parseFloat(contract.securityDeposit.securityDepositValue || 0);
        if (securityDepositValue > 0) {
            console.log(`💰 CAUÇÃO - Contrato ${contract.contractNumber}: securityDepositValue R$ ${securityDepositValue}`);
            return securityDepositValue;
        }
    }
    
    // 2. Verificar se existe campo direto de caução no contrato
    const directSecurityDeposit = parseFloat(contract.securityDepositValue || 0);
    if (directSecurityDeposit > 0) {
        console.log(`💰 CAUÇÃO - Contrato ${contract.contractNumber}: securityDepositValue direto R$ ${directSecurityDeposit}`);
        return directSecurityDeposit;
    }
    
    // 3. Verificar outros possíveis campos de caução
    const possibleCautionFields = [
        'retentionValue',
        'warrantyValue', 
        'guaranteeValue',
        'depositValue',
        'cautionValue'
    ];
    
    for (const field of possibleCautionFields) {
        const fieldValue = parseFloat(contract[field] || 0);
        if (fieldValue > 0) {
            console.log(`💰 CAUÇÃO - Contrato ${contract.contractNumber}: ${field} R$ ${fieldValue}`);
            return fieldValue;
        }
    }
    
    console.log(`💰 CAUÇÃO - Contrato ${contract.contractNumber}: Nenhuma caução configurada (R$ 0)`);
    return 0;
}

// Função para adicionar contagem de anexos aos contratos
async function addAttachmentCounts(contracts) {
    console.log(`📊 Calculando contadores de anexos para ${contracts.length} contratos`);
    
    // Obter contadores do banco de dados
    const attachmentCounts = await AttachmentDB.getAttachmentCounts();
    
    return contracts.map(contract => {
        const count = attachmentCounts[contract.contractNumber] || 0;
        
        return {
            ...contract,
            attachmentCount: count
        };
    });
}

// Rota para servir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Rota para servir a página de medições
app.get('/measurements', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'measurements.html'));
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