import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretório de dados se não existir
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Diretório de dados criado:', dataDir);
}

const dbPath = path.join(dataDir, 'attachments.db');
console.log('🗄️ Caminho do banco:', dbPath);

// Configurar SQLite para modo verbose (opcional, para debug)
const Database = sqlite3.verbose().Database;

// Criar conexão com o banco
const db = new Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar com o banco:', err.message);
    } else {
        console.log('✅ Conectado ao banco SQLite');
        initializeDatabase();
    }
});

// Função para inicializar o banco de dados
function initializeDatabase() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractNumber TEXT NOT NULL,
            fileName TEXT NOT NULL,
            fileData TEXT NOT NULL,
            fileSize INTEGER NOT NULL,
            uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela:', err.message);
        } else {
            console.log('✅ Tabela de anexos inicializada');
        }
    });
}

// Classe para gerenciar anexos
class AttachmentDB {
    static insert(contractNumber, fileName, fileData, fileSize) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO attachments (contractNumber, fileName, fileData, fileSize)
                VALUES (?, ?, ?, ?)
            `;
            
            db.run(sql, [contractNumber, fileName, fileData, fileSize], function(err) {
                if (err) {
                    console.error('❌ Erro ao inserir anexo:', err.message);
                    reject(err);
                } else {
                    console.log(`✅ Anexo inserido com ID: ${this.lastID}`);
                    resolve({ id: this.lastID });
                }
            });
        });
    }
    
    static getByContract(contractNumber) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT id, contractNumber, fileName, fileSize, uploadDate
                FROM attachments 
                WHERE contractNumber = ?
                ORDER BY uploadDate DESC
            `;
            
            db.all(sql, [contractNumber], (err, rows) => {
                if (err) {
                    console.error('❌ Erro ao buscar anexos:', err.message);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    static getById(id) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM attachments WHERE id = ?
            `;
            
            db.get(sql, [id], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar anexo por ID:', err.message);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }
    
    static deleteById(id) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM attachments WHERE id = ?`;
            
            db.run(sql, [id], function(err) {
                if (err) {
                    console.error('❌ Erro ao excluir anexo:', err.message);
                    reject(err);
                } else {
                    const success = this.changes > 0;
                    console.log(success ? `✅ Anexo ${id} excluído` : `⚠️ Anexo ${id} não encontrado`);
                    resolve(success);
                }
            });
        });
    }
    
    static getAttachmentCounts() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT contractNumber, COUNT(*) as count
                FROM attachments
                GROUP BY contractNumber
            `;
            
            db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('❌ Erro ao contar anexos:', err.message);
                    reject(err);
                } else {
                    const counts = {};
                    rows.forEach(row => {
                        counts[row.contractNumber] = row.count;
                    });
                    resolve(counts);
                }
            });
        });
    }
}

export default AttachmentDB;