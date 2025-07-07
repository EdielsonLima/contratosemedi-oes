class ContractPortal {
    constructor() {
        this.allContracts = [];
        this.filteredContracts = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filtersCollapsed = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadContracts();
    }

    initializeElements() {
        // Stats elements
        this.totalContractsCard = document.getElementById("totalContracts");
        this.totalValueCard = document.getElementById("totalValue");
        this.totalCompaniesCard = document.getElementById("totalCompanies");
        this.totalSuppliersCard = document.getElementById("totalSuppliers");
        this.expiringContractsCard = document.getElementById("expiringContracts");
        
        // Table elements
        this.contractsTableBody = document.querySelector("#contractsTable tbody");
        this.tableInfo = document.getElementById("tableInfo");
        
        // Filter elements
        this.statusFilter = document.getElementById("statusFilter");
        this.companyFilter = document.getElementById("companyFilter");
        this.supplierFilter = document.getElementById("supplierFilter");
        this.contractNumberFilter = document.getElementById("contractNumberFilter");
        this.expirationFilter = document.getElementById("expirationFilter");
        this.filtersContainer = document.getElementById("filtersContainer");
        
        // Button elements
        this.clearFiltersButton = document.getElementById("clearFilters");
        this.refreshButton = document.getElementById("refreshBtn");
        this.exportButton = document.getElementById("exportBtn");
        this.toggleFiltersButton = document.getElementById("toggleFilters");
        
        // Modal elements
        this.attachmentModal = document.getElementById("attachmentModal");
        this.closeAttachmentModal = document.getElementById("closeAttachmentModal");
        this.modalContractNumber = document.getElementById("modalContractNumber");
        this.modalContractDetails = document.getElementById("modalContractDetails");
        this.uploadArea = document.getElementById("uploadArea");
        this.fileInput = document.getElementById("fileInput");
        this.attachmentsList = document.getElementById("attachmentsList");
        
        // Other elements
        this.loadingOverlay = document.getElementById("loadingOverlay");
        this.toastContainer = document.getElementById("toastContainer");
        
        // Contract details panel elements
        this.contractDetailsPanel = document.getElementById("contractDetailsPanel");
        this.closeDetailsPanel = document.getElementById("closeDetailsPanel");
        this.contractDetailsNumber = document.getElementById("contractDetailsNumber");
        this.detailsCompany = document.getElementById("detailsCompany");
        this.detailsSupplier = document.getElementById("detailsSupplier");
        this.detailsStatus = document.getElementById("detailsStatus");
        this.contractObjectContent = document.getElementById("contractObjectContent");
        
        // Current contract for modal
        this.currentContract = null;
        this.selectedContractRow = null;
    }

    bindEvents() {
        // Filter events
        this.statusFilter.addEventListener("change", () => this.applyFilters());
        this.companyFilter.addEventListener("change", () => this.applyFilters());
        this.supplierFilter.addEventListener("change", () => this.applyFilters());
        this.contractNumberFilter.addEventListener("input", () => this.applyFilters());
        this.expirationFilter.addEventListener("change", () => this.applyFilters());
        
        // Button events
        this.clearFiltersButton.addEventListener("click", () => this.clearFilters());
        this.refreshButton.addEventListener("click", () => this.loadContracts());
        this.exportButton.addEventListener("click", () => this.exportToCSV());
        this.toggleFiltersButton.addEventListener("click", () => this.toggleFilters());
        
        // Table sorting events
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortTable(th.dataset.sort));
        });
        
        // Modal events
        this.closeAttachmentModal.addEventListener('click', () => this.closeModal());
        this.attachmentModal.addEventListener('click', (e) => {
            if (e.target === this.attachmentModal) this.closeModal();
        });
        
        // Upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.attachmentModal.classList.contains('show')) {
                this.closeModal();
            }
            if (e.key === 'Escape' && this.contractDetailsPanel.style.display !== 'none') {
                this.closeContractDetails();
            }
        });
        
        // Contract details panel events
        this.closeDetailsPanel.addEventListener('click', () => this.closeContractDetails());
    }

    showLoading() {
        this.loadingOverlay.classList.add('show');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('show');
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async loadContracts() {
        this.showLoading();
        this.refreshButton.querySelector('i').classList.add('fa-spin');
        
        try {
            const response = await fetch("/api/contracts");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.allContracts = await response.json();
            
            // DEBUG: Mostrar todos os campos do primeiro contrato
            if (this.allContracts.length > 0) {
                console.log('🔍 CAMPOS DISPONÍVEIS NO PRIMEIRO CONTRATO:');
                console.log(Object.keys(this.allContracts[0]));
                console.log('📋 DADOS COMPLETOS DO PRIMEIRO CONTRATO:');
                console.log(this.allContracts[0]);
            }
            
            this.populateFilters();
            this.applyFilters();
            this.showToast('Contratos carregados com sucesso!');
            
        } catch (error) {
            console.error("Erro ao buscar contratos:", error);
            this.showToast(`Erro ao carregar dados: ${error.message}`, 'error');
            this.contractsTableBody.innerHTML = `
                <tr><td colspan="13" class="text-center">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Erro ao carregar dados: ${error.message}
                </td></tr>
            `;
        } finally {
            this.hideLoading();
            this.refreshButton.querySelector('i').classList.remove('fa-spin');
        }
    }

    populateFilters() {
        // Clear existing options (except first)
        [this.statusFilter, this.companyFilter, this.supplierFilter].forEach(select => {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
        });

        // Populate status filter
        const statuses = [...new Set(this.allContracts.map(c => c.status))].sort();
        statuses.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            this.statusFilter.appendChild(option);
        });

        // Populate company filter
        const companies = [...new Set(this.allContracts.map(c => c.companyName))].sort();
        companies.forEach(company => {
            const option = document.createElement("option");
            option.value = company;
            option.textContent = company;
            this.companyFilter.appendChild(option);
        });

        // Populate supplier filter
        const suppliers = [...new Set(this.allContracts.map(c => c.supplierName))].sort();
        suppliers.forEach(supplier => {
            const option = document.createElement("option");
            option.value = supplier;
            option.textContent = supplier;
            this.supplierFilter.appendChild(option);
        });
    }

    // Função para calcular dias até vencimento
    getDaysToExpiration(endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zerar horas para comparação precisa
        
        const expiration = new Date(endDate);
        expiration.setHours(0, 0, 0, 0);
        
        const diffTime = expiration - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Função para verificar se contrato atende ao filtro de vencimento
    matchesExpirationFilter(contract, filterValue) {
        if (!filterValue) return true;
        
        const daysToExpiration = this.getDaysToExpiration(contract.endDate);
        
        switch (filterValue) {
            case 'expired':
                return daysToExpiration < 0;
            case 'expiring-today':
                return daysToExpiration === 0;
            case 'expiring-7':
                return daysToExpiration >= 0 && daysToExpiration <= 7;
            case 'expiring-15':
                return daysToExpiration >= 0 && daysToExpiration <= 15;
            case 'expiring-30':
                return daysToExpiration >= 0 && daysToExpiration <= 30;
            case 'expiring-60':
                return daysToExpiration >= 0 && daysToExpiration <= 60;
            case 'expiring-90':
                return daysToExpiration >= 0 && daysToExpiration <= 90;
            case 'future':
                return daysToExpiration > 90;
            default:
                return true;
        }
    }

    applyFilters() {
        const selectedStatus = this.statusFilter.value;
        const selectedCompany = this.companyFilter.value;
        const selectedSupplier = this.supplierFilter.value;
        const contractNumberText = this.contractNumberFilter.value.toLowerCase();
        const expirationFilter = this.expirationFilter.value;

        this.filteredContracts = this.allContracts.filter(contract => {
            const matchesStatus = selectedStatus ? contract.status === selectedStatus : true;
            const matchesCompany = selectedCompany ? contract.companyName === selectedCompany : true;
            const matchesSupplier = selectedSupplier ? contract.supplierName === selectedSupplier : true;
            const matchesContractNumber = contractNumberText ? 
                contract.contractNumber.toLowerCase().includes(contractNumberText) : true;
            const matchesExpiration = this.matchesExpirationFilter(contract, expirationFilter);
            
            return matchesStatus && matchesCompany && matchesSupplier && 
                   matchesContractNumber && matchesExpiration;
        });

        this.renderTable();
        this.updateStats();
    }

    // Função para mapear status específicos da sua base de dados
    getStatusClass(status) {
        if (!status) return 'status-default';
        
        // Mapeamento direto dos status que aparecem na sua base
        const statusMap = {
            'PARTIALLY_MEASURED': 'status-em-andamento',
            'FULLY_MEASURED': 'status-aprovado', 
            'COMPLETED': 'status-finalizado',
            'ACTIVE': 'status-ativo',
            'INACTIVE': 'status-inativo',
            'PENDING': 'status-pendente',
            'CANCELLED': 'status-cancelado',
            'CANCELED': 'status-cancelado',
            'SUSPENDED': 'status-suspenso',
            'RENEWED': 'status-renovado',
            'EXPIRED': 'status-vencido'
        };
        
        // Primeiro tenta o mapeamento direto
        if (statusMap[status]) {
            return statusMap[status];
        }
        
        // Se não encontrar, normaliza e tenta novamente
        const normalizedStatus = status.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[áàâã]/g, 'a')
            .replace(/[éèê]/g, 'e')
            .replace(/[íìî]/g, 'i')
            .replace(/[óòôõ]/g, 'o')
            .replace(/[úùû]/g, 'u')
            .replace(/[ç]/g, 'c')
            .toUpperCase();
        
        return statusMap[normalizedStatus] || 'status-default';
    }

    // Função para obter classe e texto dos dias para vencimento
    getExpirationDisplay(daysToExpiration) {
        if (daysToExpiration < 0) {
            return {
                class: 'days-expired',
                text: `${Math.abs(daysToExpiration)} dias vencido`,
                icon: '🔴'
            };
        } else if (daysToExpiration === 0) {
            return {
                class: 'days-expiring',
                text: 'Vence hoje',
                icon: '⚠️'
            };
        } else if (daysToExpiration <= 7) {
            return {
                class: 'days-expiring',
                text: `${daysToExpiration} dias restantes`,
                icon: '🟡'
            };
        } else if (daysToExpiration <= 30) {
            return {
                class: 'days-expiring',
                text: `${daysToExpiration} dias restantes`,
                icon: '🟠'
            };
        } else {
            return {
                class: 'days-future',
                text: `${daysToExpiration} dias restantes`,
                icon: '🟢'
            };
        }
    }

    renderTable() {
        this.contractsTableBody.innerHTML = "";
        
        if (this.filteredContracts.length === 0) {
            this.contractsTableBody.innerHTML = `
                <tr><td colspan="13" class="text-center">
                    <i class="fas fa-search"></i> 
                    Nenhum contrato encontrado com os filtros aplicados.
                </td></tr>
            `;
            this.tableInfo.textContent = "Mostrando 0 contratos";
            return;
        }

        this.filteredContracts.forEach(contract => {
            const row = this.contractsTableBody.insertRow();
            
            // Adicionar evento de clique na linha
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                // Não abrir detalhes se clicou no botão de anexos
                if (e.target.closest('.btn-attachment')) {
                    return;
                }
                this.showContractDetails(contract, row);
            });
            
            // Adicionar classe para hover
            row.classList.add('clickable-row');
            
            // Contract Number
            row.insertCell().textContent = contract.contractNumber;
            
            // Company and Supplier
            row.insertCell().textContent = contract.companyName;
            row.insertCell().textContent = contract.supplierName;
            
            // Start Date - NOVA COLUNA
            const startDateCell = row.insertCell();
            const startDate = new Date(contract.startDate);
            startDateCell.textContent = startDate.toLocaleDateString('pt-BR');
            
            // Attachments column
            const attachmentsCell = row.insertCell();
            const attachmentCount = contract.attachmentCount || 0;
            attachmentsCell.innerHTML = `
                <button class="btn-attachment" onclick="contractPortal.openAttachmentModal('${contract.contractNumber}')" title="Gerenciar anexos">
                    <i class="fas fa-paperclip"></i>
                </button>
                ${attachmentCount > 0 ? `<span class="attachment-counter">${attachmentCount}</span>` : ''}
            `;
            
            // Days to expiration with enhanced styling and icons
            const daysToExpiration = this.getDaysToExpiration(contract.endDate);
            const expirationDisplay = this.getExpirationDisplay(daysToExpiration);
            
            const diasCell = row.insertCell();
            diasCell.innerHTML = `<span class="${expirationDisplay.class}">${expirationDisplay.icon} ${expirationDisplay.text}</span>`;
            
            // Values
            const laborValue = parseFloat(contract.totalLaborValue) || 0;
            const materialValue = parseFloat(contract.totalMaterialValue) || 0;
            
            row.insertCell().textContent = laborValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            row.insertCell().textContent = materialValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Valor Total - MOVIDO PARA ANTES DE VALOR MEDIDO
            const totalValue = parseFloat(contract.valorTotal) || 0;
            row.insertCell().textContent = totalValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Valor Medido
            const measuredValue = parseFloat(contract.valorMedido) || 0;
            const measuredCell = row.insertCell();
            measuredCell.textContent = measuredValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            if (measuredValue > 0) {
                measuredCell.style.color = '#28a745';
                measuredCell.style.fontWeight = '600';
            }
            
            // Saldo do Contrato
            const balance = parseFloat(contract.saldoContrato) || 0;
            const balanceCell = row.insertCell();
            balanceCell.textContent = balance.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Colorir saldo baseado no valor
            if (balance < 0) {
                balanceCell.style.color = '#dc3545'; // Vermelho para saldo negativo
                balanceCell.style.fontWeight = '600';
            } else if (balance === 0) {
                balanceCell.style.color = '#6c757d'; // Cinza para saldo zero
                balanceCell.style.fontWeight = '600';
            } else {
                balanceCell.style.color = '#28a745'; // Verde para saldo positivo
                balanceCell.style.fontWeight = '600';
            }
            
            // Caução/Retenção - NOVA COLUNA
            const retentionValue = parseFloat(contract.retentionValue || contract.caucao || contract.retencao || contract.retention || 0);
            const retentionCell = row.insertCell();
            retentionCell.textContent = retentionValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Colorir retenção baseado no valor
            if (retentionValue > 0) {
                retentionCell.style.color = '#dc3545'; // Vermelho para retenção positiva
                retentionCell.style.fontWeight = '600';
            } else {
                retentionCell.style.color = '#6c757d'; // Cinza para sem retenção
            }
            
            // Status with enhanced styling - MOVIDO PARA O FINAL
            const statusCell = row.insertCell();
            const statusClass = this.getStatusClass(contract.status);
            statusCell.innerHTML = `<span class="status-cell ${statusClass}">${contract.status}</span>`;
        });

        this.tableInfo.textContent = `Mostrando ${this.filteredContracts.length} contratos`;
    }

    showContractDetails(contract, row) {
        // Remover seleção anterior
        if (this.selectedContractRow) {
            this.selectedContractRow.classList.remove('selected-row');
        }
        
        // Adicionar seleção à nova linha
        row.classList.add('selected-row');
        this.selectedContractRow = row;
        
        // Preencher informações básicas
        this.contractDetailsNumber.textContent = `Contrato: ${contract.contractNumber}`;
        this.detailsCompany.textContent = contract.companyName || 'N/A';
        this.detailsSupplier.textContent = contract.supplierName || 'N/A';
        
        // Status com classe CSS
        const statusClass = this.getStatusClass(contract.status);
        this.detailsStatus.innerHTML = `<span class="status-cell ${statusClass}">${contract.status}</span>`;
        
        // Preencher objeto do contrato
        const objectContent = contract.object || contract.note || contract.notes || contract.description || '';
        
        if (objectContent && objectContent.trim()) {
            this.contractObjectContent.innerHTML = `
                <div class="object-text">${objectContent.replace(/\n/g, '<br>')}</div>
            `;
        } else {
            this.contractObjectContent.innerHTML = `
                <p class="no-object">
                    <i class="fas fa-info-circle"></i> 
                    Nenhuma observação disponível para este contrato.
                </p>
            `;
        }
        
        // Mostrar painel
        this.contractDetailsPanel.style.display = 'block';
        
        // Scroll suave para o painel
        setTimeout(() => {
            this.contractDetailsPanel.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
    
    closeContractDetails() {
        this.contractDetailsPanel.style.display = 'none';
        
        // Remover seleção da linha
        if (this.selectedContractRow) {
            this.selectedContractRow.classList.remove('selected-row');
            this.selectedContractRow = null;
        }
    }

    openAttachmentModal(contractNumber) {
        this.currentContract = this.allContracts.find(c => c.contractNumber === contractNumber);
        if (!this.currentContract) return;
        
        this.modalContractNumber.textContent = `Contrato: ${this.currentContract.contractNumber}`;
        this.modalContractDetails.textContent = `${this.currentContract.companyName} - ${this.currentContract.supplierName}`;
        
        this.loadAttachments();
        this.attachmentModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        this.attachmentModal.classList.remove('show');
        document.body.style.overflow = '';
        this.currentContract = null;
    }
    
    async loadAttachments() {
        try {
            const response = await fetch(`/api/contracts/${this.currentContract.contractNumber}/attachments`);
            const attachments = response.ok ? await response.json() : [];
            
            this.renderAttachments(attachments);
        } catch (error) {
            console.error('Erro ao carregar anexos:', error);
            this.renderAttachments([]);
        }
    }
    
    renderAttachments(attachments) {
        if (attachments.length === 0) {
            this.attachmentsList.innerHTML = `
                <div class="no-attachments">
                    <i class="fas fa-folder-open"></i>
                    <p>Nenhum arquivo anexado ainda</p>
                </div>
            `;
            return;
        }
        
        this.attachmentsList.innerHTML = attachments.map(attachment => `
            <div class="attachment-item">
                <div class="attachment-info">
                    <i class="fas fa-file-pdf"></i>
                    <div class="attachment-details">
                        <span class="attachment-name">${attachment.fileName}</span>
                        <small class="attachment-date">Enviado em ${new Date(attachment.uploadDate).toLocaleDateString('pt-BR')}</small>
                    </div>
                </div>
                <div class="attachment-actions">
                    <button class="btn-download" onclick="contractPortal.downloadAttachment('${attachment.id}')" title="Baixar">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-delete" onclick="contractPortal.deleteAttachment('${attachment.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }
    
    async processFile(file) {
        // Validações
        if (file.type !== 'application/pdf') {
            this.showToast('Apenas arquivos PDF são aceitos!', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
            this.showToast('Arquivo muito grande! Máximo 10MB.', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            // Converter para Base64
            const base64 = await this.fileToBase64(file);
            
            // Enviar para o servidor
            const response = await fetch(`/api/contracts/${this.currentContract.contractNumber}/attachments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName: file.name,
                    fileData: base64,
                    fileSize: file.size
                })
            });
            
            if (response.ok) {
                this.showToast('Arquivo enviado com sucesso!');
                this.loadAttachments();
                this.fileInput.value = '';
                
                // Atualizar contador na tabela
                this.loadContracts();
            } else {
                throw new Error('Erro ao enviar arquivo');
            }
            
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            this.showToast('Erro ao enviar arquivo!', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }
    
    async downloadAttachment(attachmentId) {
        try {
            const response = await fetch(`/api/attachments/${attachmentId}/download`);
            if (!response.ok) throw new Error('Erro ao baixar arquivo');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'arquivo.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('Erro ao baixar arquivo:', error);
            this.showToast('Erro ao baixar arquivo!', 'error');
        }
    }
    
    async deleteAttachment(attachmentId) {
        if (!confirm('Tem certeza que deseja excluir este anexo?')) return;
        
        try {
            const response = await fetch(`/api/attachments/${attachmentId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showToast('Anexo excluído com sucesso!');
                this.loadAttachments();
                this.loadContracts(); // Atualizar contador
            } else {
                throw new Error('Erro ao excluir anexo');
            }
            
        } catch (error) {
            console.error('Erro ao excluir anexo:', error);
            this.showToast('Erro ao excluir anexo!', 'error');
        }
    }

    updateStats() {
        const contracts = this.filteredContracts;
        
        // Total contracts
        this.totalContractsCard.textContent = contracts.length;

        // Total value
        const totalValue = contracts.reduce((sum, c) => sum + (parseFloat(c.valorTotal) || 0), 0);
        this.totalValueCard.textContent = totalValue.toLocaleString("pt-BR", { 
            style: "currency", currency: "BRL" 
        });

        // Unique companies
        const uniqueCompanies = new Set(contracts.map(c => c.companyName));
        this.totalCompaniesCard.textContent = uniqueCompanies.size;

        // Unique suppliers
        const uniqueSuppliers = new Set(contracts.map(c => c.supplierName));
        this.totalSuppliersCard.textContent = uniqueSuppliers.size;

        // Expired contracts - CORRIGIDO: contar apenas contratos vencidos (dias negativos)
        const expiredContracts = this.allContracts.filter(contract => {
            const daysToExpiration = this.getDaysToExpiration(contract.endDate);
            return daysToExpiration < 0; // Apenas contratos vencidos
        });
        this.expiringContractsCard.textContent = expiredContracts.length;
    }

    sortTable(column) {
        // Update sort direction
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Update UI
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const currentTh = document.querySelector(`th[data-sort="${column}"]`);
        currentTh.classList.add(`sort-${this.sortDirection}`);

        // Sort data
        this.filteredContracts.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle different data types
            if (column === 'startDate') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (column === 'diasVencimento') {
                aVal = this.getDaysToExpiration(a.endDate);
                bVal = this.getDaysToExpiration(b.endDate);
            } else if (column.includes('Value') || column === 'valorTotal') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (column === 'valorMedido' || column === 'saldoContrato') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (column === 'retentionValue') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderTable();
    }

    clearFilters() {
        this.statusFilter.value = "";
        this.companyFilter.value = "";
        this.supplierFilter.value = "";
        this.contractNumberFilter.value = "";
        this.expirationFilter.value = "";
        
        this.applyFilters();
        this.showToast('Filtros limpos com sucesso!');
    }

    toggleFilters() {
        this.filtersCollapsed = !this.filtersCollapsed;
        
        if (this.filtersCollapsed) {
            this.filtersContainer.classList.add('collapsed');
            this.toggleFiltersButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
            this.filtersContainer.classList.remove('collapsed');
            this.toggleFiltersButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    }

    exportToCSV() {
        if (this.filteredContracts.length === 0) {
            this.showToast('Nenhum contrato para exportar!', 'warning');
            return;
        }

        const headers = [
            'Nº Contrato',
            'Empresa',
            'Fornecedor',
            'Início',
            'Dias',
            'Valor Mão de Obra',
            'Valor Material',
            'Valor Total',
            'Valor Medido',
            'Saldo',
            'Caução/Retenção',
            'Status',
            'Situação de Vencimento'
        ];

        const csvContent = [
            headers.join(','),
            ...this.filteredContracts.map(contract => {
                const daysToExpiration = this.getDaysToExpiration(contract.endDate);
                const expirationDisplay = this.getExpirationDisplay(daysToExpiration);
                
                return [
                    `"${contract.contractNumber}"`,
                    `"${contract.companyName}"`,
                    `"${contract.supplierName}"`,
                    `"${new Date(contract.startDate).toLocaleDateString('pt-BR')}"`,
                    daysToExpiration,
                    parseFloat(contract.totalLaborValue) || 0,
                    parseFloat(contract.totalMaterialValue) || 0,
                    parseFloat(contract.valorTotal) || 0,
                    parseFloat(contract.valorMedido) || 0,
                    parseFloat(contract.saldoContrato) || 0,
                    parseFloat(contract.retentionValue || contract.caucao || contract.retencao || contract.retention || 0),
                    `"${contract.status}"`,
                    `"${expirationDisplay.text}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `contratos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Arquivo CSV exportado com sucesso!');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.contractPortal = new ContractPortal();
});