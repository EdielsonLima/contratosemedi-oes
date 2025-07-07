import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import AttachmentDB from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Configurações da API Sienge
const API_BASE_URL = 'https://api.sienge.com.br/silvapacker/public/api/v1';
const API_CREDENTIALS = {
    username: 'silvapacker.api',
    password: 'X9k2L#mP8qR$vN3w'
};

// Função para fazer requisições autenticadas
async function makeAuthenticatedRequest(url) {
    const auth = Buffer.from(`${API_CREDENTIALS.username}:${API_CREDENTIALS.password}`).toString('base64');
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// Função para buscar todos os contratos com paginação
async function fetchAllContracts() {
    let allContracts = [];
    let offset = 0;
    const limit = 200;
    let hasMore = true;

    while (hasMore) {
        try {
            const url = `${API_BASE_URL}/supply-contracts?limit=${limit}&offset=${offset}`;
            console.log(`🔄 Buscando contratos: offset=${offset}, limit=${limit}`);
            
            const data = await makeAuthenticatedRequest(url);
            
            if (data && data.data && Array.isArray(data.data)) {
                allContracts = allContracts.concat(data.data);
                console.log(`✅ Recebidos ${data.data.length} contratos. Total: ${allContracts.length}`);
                
                // Verificar se há mais dados
                hasMore = data.data.length === limit;
                offset += limit;
            } else {
                console.log('❌ Estrutura de dados inesperada:', data);
                hasMore = false;
            }
        } catch (error) {
            console.error(`❌ Erro ao buscar contratos (offset ${offset}):`, error.message);
            hasMore = false;
        }
    }

    console.log(`🎉 Total de contratos carregados: ${allContracts.length}`);
    return allContracts;
}

// Função para buscar todas as medições com paginação
async function fetchAllMeasurements() {
    let allMeasurements = [];
    let offset = 0;
    const limit = 200;
    let hasMore = true;

    while (hasMore) {
        try {
            const url = `${API_BASE_URL}/supply-contracts/measurements/all?limit=${limit}&offset=${offset}`;
            console.log(`🔄 Buscando medições: offset=${offset}, limit=${limit}`);
            
            const data = await makeAuthenticatedRequest(url);
            
            if (data && data.data && Array.isArray(data.data)) {
                allMeasurements = allMeasurements.concat(data.data);
                console.log(`✅ Recebidas ${data.data.length} medições. Total: ${allMeasurements.length}`);
                
                // Verificar se há mais dados
                hasMore = data.data.length === limit;
                offset += limit;
            } else {
                console.log('❌ Estrutura de dados inesperada:', data);
                hasMore = false;
            }
        } catch (error) {
            console.error(`❌ Erro ao buscar medições (offset ${offset}):`, error.message);
            hasMore = false;
        }
    }

    console.log(`🎉 Total de medições carregadas: ${allMeasurements.length}`);
    return allMeasurements;
}

// API Routes
app.get('/api/contracts', async (req, res) => {
    try {
        console.log('📡 Iniciando busca de contratos...');
        const contracts = await fetchAllContracts();
        
        // Buscar contadores de anexos
        const attachmentCounts = await AttachmentDB.getAttachmentCounts();
        
        // Adicionar contador de anexos aos contratos
        const contractsWithAttachments = contracts.map(contract => ({
            ...contract,
            attachmentCount: attachmentCounts[contract.contractNumber] || 0
        }));
        
        res.json(contractsWithAttachments);
    } catch (error) {
        console.error('❌ Erro na API de contratos:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar contratos', 
            details: error.message 
        });
    }
});

app.get('/api/measurements', async (req, res) => {
    try {
        console.log('📡 Iniciando busca de medições...');
        const measurements = await fetchAllMeasurements();
        res.json(measurements);
    } catch (error) {
        console.error('❌ Erro na API de medições:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar medições', 
            details: error.message 
        });
    }
});

// Attachment routes
app.get('/api/contracts/:contractNumber/attachments', async (req, res) => {
    try {
        const { contractNumber } = req.params;
        const attachments = await AttachmentDB.getByContract(contractNumber);
        res.json(attachments);
    } catch (error) {
        console.error('Erro ao buscar anexos:', error);
        res.status(500).json({ error: 'Erro ao buscar anexos' });
    }
});

app.post('/api/contracts/:contractNumber/attachments', async (req, res) => {
    try {
        const { contractNumber } = req.params;
        const { fileName, fileData, fileSize } = req.body;
        
        const result = await AttachmentDB.insert(contractNumber, fileName, fileData, fileSize);
        res.json({ success: true, id: result.id });
    } catch (error) {
        console.error('Erro ao salvar anexo:', error);
        res.status(500).json({ error: 'Erro ao salvar anexo' });
    }
});

app.get('/api/attachments/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        const attachment = await AttachmentDB.getById(id);
        
        if (!attachment) {
            return res.status(404).json({ error: 'Anexo não encontrado' });
        }
        
        const buffer = Buffer.from(attachment.fileData, 'base64');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Erro ao baixar anexo:', error);
        res.status(500).json({ error: 'Erro ao baixar anexo' });
    }
});

app.delete('/api/attachments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const success = await AttachmentDB.deleteById(id);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Anexo não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao excluir anexo:', error);
        res.status(500).json({ error: 'Erro ao excluir anexo' });
    }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'static')));

// Rota para a página de medições
app.get('/measurements', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'measurements.html'));
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Catch-all route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`📊 Medições: http://localhost:${PORT}/measurements`);
});