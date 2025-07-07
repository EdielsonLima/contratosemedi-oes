import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretório de dados se não existir
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Diretório de dados criado:', dataDir);
}

// Caminho do banco de dados
const dbPath = path.join(dataDir, 'attachments.db');
console.log('🗄️ Caminho do banco:', dbPath);

// Inicializar banco de dados
const db = new Database(dbPath);

// Configurar WAL mode para melhor performance
db.pragma('journal_mode = WAL');

// Criar tabela de anexos se não existir
const createTable = `
    CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_number TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_data TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        upload_date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`;

db.exec(createTable);

// Criar índice para melhor performance
db.exec('CREATE INDEX IF NOT EXISTS idx_contract_number ON attachments(contract_number)');

console.log(`✅ Banco de dados SQLite inicializado: ${dbPath}`);

// Preparar statements para melhor performance
const statements = {
    insert: db.prepare(`
        INSERT INTO attachments (contract_number, file_name, file_data, file_size, upload_date)
        VALUES (?, ?, ?, ?, ?)
    `),
    
    getByContract: db.prepare(`
        SELECT id, contract_number, file_name, file_size, upload_date
        FROM attachments 
        WHERE contract_number = ?
        ORDER BY created_at DESC
    `),
    
    getById: db.prepare(`
        SELECT * FROM attachments WHERE id = ?
    `),
    
    deleteById: db.prepare(`
        DELETE FROM attachments WHERE id = ?
    `),
    
    getAll: db.prepare(`
        SELECT contract_number, COUNT(*) as count
        FROM attachments 
        GROUP BY contract_number
    `),
    
    count: db.prepare(`
        SELECT COUNT(*) as total FROM attachments
    `)
};

class AttachmentDB {
    // Inserir novo anexo
    static insert(contractNumber, fileName, fileData, fileSize) {
        try {
            const uploadDate = new Date().toISOString();
            const result = statements.insert.run(contractNumber, fileName, fileData, fileSize, uploadDate);
            
            console.log(`✅ Anexo inserido no banco: ID ${result.lastInsertRowid}, Contrato: ${contractNumber}, Arquivo: ${fileName}`);
            
            return {
                id: result.lastInsertRowid,
                contractNumber,
                fileName,
                fileSize,
                uploadDate
            };
        } catch (error) {
            console.error('❌ Erro ao inserir anexo no banco:', error);
            throw error;
        }
    }
    
    // Buscar anexos por contrato
    static getByContract(contractNumber) {
        try {
            const attachments = statements.getByContract.all(contractNumber);
            console.log(`🔍 Buscando anexos para contrato ${contractNumber}: ${attachments.length} encontrados`);
            return attachments.map(att => ({
                id: att.id,
                contractNumber: att.contract_number,
                fileName: att.file_name,
                fileSize: att.file_size,
                uploadDate: att.upload_date
            }));
        } catch (error) {
            console.error('❌ Erro ao buscar anexos por contrato:', error);
            return [];
        }
    }
    
    // Buscar anexo por ID (com dados do arquivo)
    static getById(id) {
        try {
            const attachment = statements.getById.get(id);
            if (attachment) {
                console.log(`🔍 Anexo encontrado: ID ${id}, Arquivo: ${attachment.file_name}`);
                return {
                    id: attachment.id,
                    contractNumber: attachment.contract_number,
                    fileName: attachment.file_name,
                    fileData: attachment.file_data,
                    fileSize: attachment.file_size,
                    uploadDate: attachment.upload_date
                };
            } else {
                console.log(`❌ Anexo não encontrado: ID ${id}`);
                return null;
            }
        } catch (error) {
            console.error('❌ Erro ao buscar anexo por ID:', error);
            return null;
        }
    }
    
    // Excluir anexo
    static deleteById(id) {
        try {
            const result = statements.deleteById.run(id);
            if (result.changes > 0) {
                console.log(`🗑️ Anexo excluído: ID ${id}`);
                return true;
            } else {
                console.log(`❌ Anexo não encontrado para exclusão: ID ${id}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao excluir anexo:', error);
            return false;
        }
    }
    
    // Obter contadores de anexos por contrato
    static getAttachmentCounts() {
        try {
            const counts = statements.getAll.all();
            const countsMap = {};
            counts.forEach(row => {
                countsMap[row.contract_number] = row.count;
            });
            console.log(`📊 Contadores de anexos carregados: ${counts.length} contratos com anexos`);
            return countsMap;
        } catch (error) {
            console.error('❌ Erro ao obter contadores:', error);
            return {};
        }
    }
    
    // Obter total de anexos
    static getTotalCount() {
        try {
            const result = statements.count.get();
            const total = result.total;
            console.log(`📊 Total de anexos no banco: ${total}`);
            return total;
        } catch (error) {
            console.error('❌ Erro ao contar anexos:', error);
            return 0;
        }
    }
    
    // Verificar integridade do banco
    static checkIntegrity() {
        try {
            const result = db.pragma('integrity_check');
            const isOk = result[0].integrity_check === 'ok';
            console.log(`🔍 Verificação de integridade do banco: ${isOk ? 'OK' : 'ERRO'}`);
            return isOk;
        } catch (error) {
            console.error('❌ Erro na verificação de integridade:', error);
            return false;
        }
    }
}

// Verificar integridade na inicialização
AttachmentDB.checkIntegrity();

// Log inicial
const totalAttachments = AttachmentDB.getTotalCount();
console.log(`🚀 Sistema de anexos inicializado com ${totalAttachments} anexos`);

export default AttachmentDB;