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
        
        // Other elements
        this.loadingOverlay = document.getElementById("loadingOverlay");
        this.toastContainer = document.getElementById("toastContainer");
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
            this.populateFilters();
            this.applyFilters();
            this.showToast('Contratos carregados com sucesso!');
            
        } catch (error) {
            console.error("Erro ao buscar contratos:", error);
            this.showToast(`Erro ao carregar dados: ${error.message}`, 'error');
            this.contractsTableBody.innerHTML = `
                <tr><td colspan="9" class="text-center">
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
                <tr><td colspan="9" class="text-center">
                    <i class="fas fa-search"></i> 
                    Nenhum contrato encontrado com os filtros aplicados.
                </td></tr>
            `;
            this.tableInfo.textContent = "Mostrando 0 contratos";
            return;
        }

        this.filteredContracts.forEach(contract => {
            const row = this.contractsTableBody.insertRow();
            
            // Contract Number
            row.insertCell().textContent = contract.contractNumber;
            
            // Status with enhanced styling - CORRIGIDO
            const statusCell = row.insertCell();
            const statusClass = this.getStatusClass(contract.status);
            statusCell.innerHTML = `<span class="status-cell ${statusClass}">${contract.status}</span>`;
            
            // Company and Supplier
            row.insertCell().textContent = contract.companyName;
            row.insertCell().textContent = contract.supplierName;
            
            // End Date
            const endDateCell = row.insertCell();
            const endDate = new Date(contract.endDate);
            endDateCell.textContent = endDate.toLocaleDateString('pt-BR');
            
            // Days to expiration with enhanced styling and icons
            const daysToExpiration = this.getDaysToExpiration(contract.endDate);
            const expirationDisplay = this.getExpirationDisplay(daysToExpiration);
            
            const diasCell = row.insertCell();
            diasCell.innerHTML = `<span class="${expirationDisplay.class}">${expirationDisplay.icon} ${expirationDisplay.text}</span>`;
            
            // Values
            const laborValue = parseFloat(contract.totalLaborValue) || 0;
            const materialValue = parseFloat(contract.totalMaterialValue) || 0;
            const totalValue = parseFloat(contract.valorTotal) || 0;
            
            row.insertCell().textContent = laborValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            row.insertCell().textContent = materialValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            row.insertCell().textContent = totalValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        });

        this.tableInfo.textContent = `Mostrando ${this.filteredContracts.length} contratos`;
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

        // Expiring contracts - CORRIGIDO: usar todos os contratos, não apenas os filtrados
        const allExpiringContracts = this.allContracts.filter(contract => {
            const daysToExpiration = this.getDaysToExpiration(contract.endDate);
            return daysToExpiration >= 0 && daysToExpiration <= 30;
        });
        this.expiringContractsCard.textContent = allExpiringContracts.length;
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
            if (column === 'endDate') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (column === 'diasVencimento') {
                aVal = this.getDaysToExpiration(a.endDate);
                bVal = this.getDaysToExpiration(b.endDate);
            } else if (column.includes('Value') || column === 'valorTotal') {
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
            'Status',
            'Empresa',
            'Fornecedor',
            'Vencimento',
            'Dias',
            'Situação de Vencimento',
            'Valor Mão de Obra',
            'Valor Material',
            'Valor Total'
        ];

        const csvContent = [
            headers.join(','),
            ...this.filteredContracts.map(contract => {
                const endDate = new Date(contract.endDate);
                const daysToExpiration = this.getDaysToExpiration(contract.endDate);
                const expirationDisplay = this.getExpirationDisplay(daysToExpiration);
                
                return [
                    `"${contract.contractNumber}"`,
                    `"${contract.status}"`,
                    `"${contract.companyName}"`,
                    `"${contract.supplierName}"`,
                    `"${endDate.toLocaleDateString('pt-BR')}"`,
                    daysToExpiration,
                    `"${expirationDisplay.text}"`,
                    parseFloat(contract.totalLaborValue) || 0,
                    parseFloat(contract.totalMaterialValue) || 0,
                    parseFloat(contract.valorTotal) || 0
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
    new ContractPortal();
});